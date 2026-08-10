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
          receiptUrl:"https://drive.example/receipt-1",
          fileName:"receipt.jpg",
          extraction:{
            merchantName:"Kedai Makan",
            amount:"12.50",
            currency:"MYR",
            rawText:"KEDAI MAKAN RM12.50",
            confidence:0.95,
            latencyMs:10,
            model:"qwen/qwen3.6-27b",
          },
        };
      },
    };
    service.safeSendWebhookReply =
      async (_normalized:any, text:string) => {
        reply = text;
      };
    service.transactionService = {
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
    assert.match(
      reply,
      /https:\/\/drive.example\/receipt-1/,
    );
    assert.match(
      reply,
      /!confirm/,
    );
    assert.equal(
      transactionCalls,
      0,
    );
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
  "receipt confirm records the pending draft with its Drive URL",
  async () => {
    const service =
      createService(
        "receipts-folder",
      );

    let reply = "";
    let capturedDraft:any = null;
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
    service.createReceiptTransaction =
      async (draft:any) => {
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
        receiptUrl:"https://drive.example/receipt-1",
        fileName:"receipt.jpg",
        extraction:{
          merchantName:"Kedai Makan",
          amount:"12.50",
          currency:"MYR",
          rawText:"KEDAI MAKAN RM12.50",
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
    assert.match(
      reply,
      /transaksi direkodkan/,
    );
    assert.equal(
      service.receiptDrafts.has(
        "workspace-1:user-1",
      ),
      false,
    );
  },
);
