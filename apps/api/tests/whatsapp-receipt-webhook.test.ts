import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppService,
} from "../src/modules/whatsapp/whatsapp.service.js";


const payload = {
  event:"messages.upsert",
  instance:"demo",
  data:{
    key:{
      fromMe:false,
      remoteJid:"60123456789@s.whatsapp.net",
      id:"receipt-1",
    },
    message:{
      imageMessage:{
        mimetype:"image/jpeg",
        fileName:"receipt.jpg",
      },
    },
  },
};


function createService(folderId:string | null){

  const app = {
    prisma:{
      whatsAppInstance:{
        findUnique:async () => ({
          workspaceId:"workspace-1",
          instanceName:"demo",
          botAlias:"mypocket",
        }),
      },
      workspaceGoogleSetting:{
        findUnique:async () =>
          folderId === null
            ?
            null
            :
            {receiptsFolderId:folderId},
      },
    },
  };

  return new WhatsAppService(
    app as any,
  ) as any;

}


test(
  "linked receipt image returns draft metadata without financial execution",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    let reply = "";
    let transactionCalls = 0;
    let uploadCalls = 0;
    service.findWebhookActorMember =
      async () => ({
        userId:"user-1",
        role:"MEMBER",
      });
    service.receiptPipeline = {
      process:async (input:any) => {
        assert.equal(
          input.receiptsFolderId,
          "receipts-folder",
        );
        return {
          status:"draft_ready",
          source:"RECEIPT",
          fileName:"receipt.jpg",
          pendingUpload:{
            bytes:new Uint8Array([1, 2, 3]),
            mimeType:"image/jpeg",
            fileName:"receipt.jpg",
          },
          extraction:{
            merchantName:"Kedai Makan",
            receiptType:"DINING",
            amount:"12.50",
            currency:"MYR",
            rawText:"KEDAI MAKAN RM12.50",
            confidence:0.95,
            latencyMs:10,
            model:"qwen/qwen3.6-27b",
          },
        };
      },
      storeConfirmedReceipt:async () => {
        uploadCalls += 1;
        throw new Error("must not upload before confirmation");
      },
    };
    service.safeSendWebhookReply =
      async (_normalized:any, text:string) => {
        reply = text;
      };
    service.transactionService = {
      getSheetCategoryNames:async () => [],
      getSheetTransactions:async () => [],
      createTransaction:async () => {
        transactionCalls += 1;
      },
    };

    const result =
      await service.handleEvolutionWebhook(
        payload,
      );

    assert.equal(
      result.source,
      "RECEIPT",
    );
    assert.equal(
      result.message,
      "WhatsApp receipt draft ready",
    );
    assert.doesNotMatch(
      reply,
      /drive\.example/,
    );
    assert.match(
      reply,
      /!confirm dalam 1 minit/,
    );
    assert.match(
      reply,
      /Jenis: Makanan dan minuman \(Food\)/,
    );
    assert.equal(
      transactionCalls,
      0,
    );
    assert.equal(
      uploadCalls,
      0,
    );
    assert.equal(
      (result.receipt as any).pendingUpload,
      undefined,
    );
    const draft =
      service.receiptDrafts.get(
        "workspace-1:user-1",
      );
    assert.ok(
      draft.expiresAt - Date.now() <= 60_000
      &&
      draft.expiresAt - Date.now() > 58_000,
    );
  },
);


test(
  "unconfirmed receipt bytes are discarded automatically after expiry",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    const key =
      "workspace-1:user-1";
    const expiresAt =
      Date.now() + 20;

    service.receiptDrafts.set(
      key,
      {
        workspaceId:"workspace-1",
        actorUserId:"user-1",
        role:"MEMBER",
        language:"ms",
        receiptsFolderId:"receipts-folder",
        pendingUpload:{
          bytes:new Uint8Array([1, 2, 3]),
          mimeType:"image/jpeg",
          fileName:"receipt.jpg",
        },
        fileName:"receipt.jpg",
        extraction:{
          amount:"12.50",
          rawText:"TOTAL RM12.50",
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
        expiresAt,
      },
    );

    service.scheduleReceiptDraftExpiry(
      key,
      expiresAt,
    );

    await new Promise(
      (resolve) => setTimeout(resolve, 50),
    );

    assert.equal(
      service.receiptDrafts.has(key),
      false,
    );
  },
);


test(
  "reuses only confirmed receipt history as workspace merchant memory",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    const requestedWorkspaces:string[] = [];
    service.transactionService = {
      getSheetCategoryNames:async () => [],
      getSheetTransactions:async (workspaceId:string) => {
        requestedWorkspaces.push(workspaceId);
        return [
          {
            source:"WHATSAPP_RECEIPT",
            merchant:{name:"Shell Malaysia Trading"},
            category:{name:"Transport"},
          },
          {
            source:"WHATSAPP",
            merchant:{name:"Shell Malaysia Trading"},
            category:{name:"Shopping"},
          },
        ];
      },
    };

    const extraction =
      await service.enrichReceiptClassification(
        "workspace-family",
        {
          merchantName:"Shell Malaysia Trading Sdn Bhd",
          receiptType:"OTHER",
          classificationSource:"GROQ",
          rawText:"SHELL THANK YOU GRAND TOTAL RM50.00",
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
      );

    assert.deepEqual(
      requestedWorkspaces,
      ["workspace-family"],
    );
    assert.equal(extraction.receiptType, "FUEL");
    assert.equal(extraction.categoryName, "Transport");
    assert.equal(extraction.classificationSource, "MEMORY");
  },
);


test(
  "repairs merchant memory when a confirmed receipt description proves it was fuel",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    service.transactionService = {
      getSheetCategoryNames:async () => [
        "Food",
        "Transport",
        "Shopping",
        "Others",
      ],
      getSheetTransactions:async () => [
        {
          source:"WHATSAPP_RECEIPT",
          merchant:{name:"MANKON PHOENIX ENTERPRISE"},
          category:{name:"Shopping"},
          description:
            "FS Diesel, Pump 8, 85.340 L @ RM4.570/L",
        },
      ],
    };

    const extraction =
      await service.enrichReceiptClassification(
        "workspace-family",
        {
          merchantName:"MANKON PHOENIX ENTERPRISE",
          receiptType:"OTHER",
          classificationSource:"GROQ",
          rawText:"MANKON PHOENIX ENTERPRISE TOTAL RM390.00",
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
      );

    assert.equal(extraction.receiptType, "FUEL");
    assert.equal(extraction.categoryName, "Transport");
    assert.equal(extraction.classificationSource, "MEMORY");
  },
);


test(
  "maps receipt types to the categories available in the workspace sheet",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    service.transactionService = {
      getSheetCategoryNames:async () => [
        "Sales",
        "Marketing",
        "Office",
        "Salary",
        "Supplier",
        "Rental",
        "Utilities",
        "Travel",
        "Tax",
        "Others",
      ],
      getSheetTransactions:async () => [],
    };

    const fuel =
      await service.enrichReceiptClassification(
        "workspace-business",
        {
          merchantName:"Shell",
          receiptType:"FUEL",
          classificationSource:"EVIDENCE",
          rawText:"Pump 1 Diesel",
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
      );

    const utility =
      await service.enrichReceiptClassification(
        "workspace-business",
        {
          merchantName:"TNB",
          receiptType:"UTILITIES",
          classificationSource:"GROQ",
          rawText:"Electricity bill",
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
      );

    assert.equal(fuel.categoryName, "Travel");
    assert.equal(utility.categoryName, "Utilities");
  },
);


test(
  "receipt image fails closed when workspace has no receipts folder",
  async () => {
    const service =
      createService(
        null,
      );
    service.findWebhookActorMember =
      async () => ({
        userId:"user-1",
        role:"MEMBER",
      });

    const result =
      await service.handleEvolutionWebhook(
        payload,
      );

    assert.equal(
      result.source,
      "RECEIPT",
    );
    assert.equal(
      result.receipt.reason,
      "RECEIPT_FOLDER_NOT_CONFIGURED",
    );
  },
);

test(
  "receipt confirm uploads first and then records the pending draft",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    let reply = "";
    let capturedDraft:any = null;
    const events:string[] = [];
    service.findWebhookActorMember =
      async () => ({
        userId:"user-1",
        role:"MEMBER",
      });
    service.getWorkspaceReplyLanguage =
      async () => "ms";
    service.safeSendWebhookReply =
      async (_normalized:any, text:string) => {
        reply = text;
      };
    service.receiptPipeline = {
      storeConfirmedReceipt:async (input:any) => {
        events.push("upload");
        assert.equal(
          input.receiptsFolderId,
          "receipts-folder",
        );
        return {
          status:"success",
          receiptUrl:"https://drive.example/receipt-1",
          fileName:"receipt.jpg",
        };
      },
    };
    service.createReceiptTransaction =
      async (draft:any) => {
        events.push("transaction");
        capturedDraft = draft;
        return {id:"transaction-1"};
      };
    service.receiptDrafts.set(
      "workspace-1:user-1",
      {
        workspaceId:"workspace-1",
        actorUserId:"user-1",
        role:"MEMBER",
        language:"ms",
        receiptsFolderId:"receipts-folder",
        pendingUpload:{
          bytes:new Uint8Array([1, 2, 3]),
          mimeType:"image/jpeg",
          fileName:"receipt.jpg",
        },
        fileName:"receipt.jpg",
        extraction:{
          merchantName:"MANKON PHOENIX ENTERPRISE",
          merchantBrand:"Shell",
          receiptType:"FUEL",
          categoryName:"Transport",
          purchaseDetails:
            "FS Diesel, Pump 8, 85.340 L @ RM4.570/L",
          amount:"390.00",
          currency:"MYR",
          rawText:"FS Diesel Pump 8 TOTAL RM390.00",
          confidence:0.95,
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
        expiresAt:Date.now() + 60_000,
      },
    );

    const result =
      await service.handleEvolutionWebhook({
        event:"messages.upsert",
        instance:"demo",
        data:{
          key:{
            fromMe:false,
            remoteJid:"60123456789@s.whatsapp.net",
            id:"receipt-confirm-1",
          },
          message:{
            conversation:"!confirm",
          },
        },
      });

    assert.equal(
      result.message,
      "WhatsApp receipt confirmed",
    );
    assert.equal(
      capturedDraft.receiptUrl,
      "https://drive.example/receipt-1",
    );
    assert.deepEqual(
      events,
      ["upload", "transaction"],
    );
    assert.match(
      reply,
      /transaksi direkodkan/,
    );
    assert.match(
      reply,
      /Butiran: FS Diesel, Pump 8, 85\.340 L @ RM4\.570\/L/,
    );
    assert.equal(
      service.receiptDrafts.has(
        "workspace-1:user-1",
      ),
      false,
    );
  },
);


test(
  "receipt confirm normalizes a Malaysian receipt date before recording",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    let capturedInput:any = null;
    service.findWebhookActorMember =
      async () => ({
        userId:"user-1",
        role:"MEMBER",
      });
    service.getWorkspaceReplyLanguage =
      async () => "ms";
    service.safeSendWebhookReply =
      async () => {};
    let categoryName = "";
    service.findOrCreateCategory =
      async (_workspaceId:string, name:string) => {
        categoryName = name;
        return {id:"category-1"};
      };
    service.findOrCreateMerchant =
      async () => ({id:"merchant-1"});
    service.transactionService = {
      createTransaction:async (_role:any, input:any) => {
        capturedInput = input;
        assert.equal(
          Number.isNaN(
            input.transactionDate.getTime(),
          ),
          false,
        );
        return {id:"transaction-1"};
      },
    };
    service.receiptDrafts.set(
      "workspace-1:user-1",
      {
        workspaceId:"workspace-1",
        actorUserId:"user-1",
        role:"MEMBER",
        language:"ms",
        receiptUrl:"https://drive.example/receipt-date",
        fileName:"receipt.jpg",
        extraction:{
          merchantName:"99 Speed Mart",
          receiptType:"GROCERIES",
          categoryName:"Shopping",
          description:"Groceries",
          purchaseDetails:
            "Household groceries, 3 items",
          receiptReference:"REF-2026-001",
          amount:"17.35",
          currency:"MYR",
          transactionDate:"31/07/2026 15:30",
          rawText:"31/07/2026 15:30 NET TOTAL RM17.35",
          confidence:0.9,
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
        expiresAt:Date.now() + 60_000,
      },
    );

    const result =
      await service.handleEvolutionWebhook({
        event:"messages.upsert",
        instance:"demo",
        data:{
          key:{
            fromMe:false,
            remoteJid:"60123456789@s.whatsapp.net",
            id:"receipt-confirm-date",
          },
          message:{
            conversation:"!confirm",
          },
        },
      });

    assert.equal(
      result.message,
      "WhatsApp receipt confirmed",
    );
    assert.equal(
      capturedInput.transactionDate.toISOString(),
      "2026-07-31T15:30:00.000Z",
    );
    assert.equal(
      categoryName,
      "Shopping",
    );
    assert.equal(
      capturedInput.description,
      "Household groceries, 3 items",
    );
    assert.equal(
      capturedInput.receiptReference,
      "REF-2026-001",
    );
    assert.equal(
      service.normalizeReceiptTransactionDate(
        "07/31/2026 15:30",
      ),
      "2026-07-31T15:30:00.000Z",
    );
    assert.equal(
      service.normalizeReceiptTransactionDate(
        "2026-07-31",
      ),
      "2026-07-31T00:00:00.000Z",
    );
  },
);


test(
  "receipt confirm falls back safely when OCR date is invalid",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    const startedAt =
      Date.now();
    let recordedAt = 0;
    service.findWebhookActorMember =
      async () => ({
        userId:"user-1",
        role:"MEMBER",
      });
    service.getWorkspaceReplyLanguage =
      async () => "ms";
    service.safeSendWebhookReply =
      async () => {};
    service.findOrCreateCategory =
      async () => ({id:"category-1"});
    service.findOrCreateMerchant =
      async () => ({id:"merchant-1"});
    service.transactionService = {
      createTransaction:async (_role:any, input:any) => {
        recordedAt =
          input.transactionDate.getTime();
        assert.equal(
          Number.isNaN(recordedAt),
          false,
        );
        return {id:"transaction-1"};
      },
    };
    service.receiptDrafts.set(
      "workspace-1:user-1",
      {
        workspaceId:"workspace-1",
        actorUserId:"user-1",
        role:"MEMBER",
        language:"ms",
        receiptUrl:"https://drive.example/receipt-invalid-date",
        fileName:"receipt.jpg",
        extraction:{
          merchantName:"Ninso",
          amount:"19.60",
          currency:"MYR",
          transactionDate:"DATE NOT CLEAR",
          rawText:"DATE NOT CLEAR TOTAL RM19.60",
          confidence:0.8,
          latencyMs:10,
          model:"qwen/qwen3.6-27b",
        },
        expiresAt:Date.now() + 60_000,
      },
    );

    const result =
      await service.handleEvolutionWebhook({
        event:"messages.upsert",
        instance:"demo",
        data:{
          key:{
            fromMe:false,
            remoteJid:"60123456789@s.whatsapp.net",
            id:"receipt-confirm-invalid-date",
          },
          message:{
            conversation:"!confirm",
          },
        },
      });

    assert.equal(
      result.message,
      "WhatsApp receipt confirmed",
    );
    assert.ok(
      recordedAt >= startedAt
      &&
      recordedAt <= Date.now(),
    );
  },
);
