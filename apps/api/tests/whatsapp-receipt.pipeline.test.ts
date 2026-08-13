import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppReceiptPipeline,
} from "../src/modules/whatsapp/whatsapp-receipt.pipeline.js";


const image = {
  kind:"image",
  mimeType:"image/jpeg",
  fileName:"receipt.jpg",
} as const;


function downloader(){
  return {
    async download(){
      return {
        status:"success" as const,
        provider:"evolution",
        value:{
          bytes:new Uint8Array([1, 2, 3]),
          mimeType:"image/jpeg",
          fileName:"receipt.jpg",
        },
      };
    },
  };
}


function storage(){
  const calls:{count:number} = {count:0};
  return {
    calls,
    async store(){
      calls.count += 1;
      return {
        id:"file-1",
        url:"https://drive.example/file-1",
        name:"receipt.jpg",
        mimeType:"image/jpeg",
      };
    },
  };
}


test(
  "keeps an image draft in memory and uploads only after confirmation",
  async () => {
    const saved =
      storage();
    const pipeline =
      new WhatsAppReceiptPipeline(
        downloader(),
        {
          async extractReceipt(){
            return {
              status:"success" as const,
              provider:"groq-vision",
              value:{
                amount:"12.50",
                currency:"MYR",
                merchantName:"Kedai Makan",
                rawText:"KEDAI MAKAN RM12.50",
                confidence:0.95,
                latencyMs:10,
                model:"qwen/qwen3.6-27b",
              },
            };
          },
        },
        saved,
      );

    const result =
      await pipeline.process({
        workspaceId:"workspace-1",
        instanceName:"demo",
        messageId:"receipt-1",
        message:{key:{id:"receipt-1"}},
        media:image,
        receiptsFolderId:"folder-1",
      });

    assert.equal(
      result.status,
      "draft_ready",
    );
    assert.equal(
      (result as any).receiptUrl,
      undefined,
    );
    assert.equal(
      (result as any).extraction.amount,
      "12.50",
    );
    assert.equal(
      saved.calls.count,
      0,
    );

    const confirmed =
      await pipeline.storeConfirmedReceipt({
        workspaceId:"workspace-1",
        receiptsFolderId:"folder-1",
        media:(result as any).pendingUpload,
      });

    assert.equal(
      confirmed.status,
      "success",
    );
    assert.equal(
      (confirmed as any).receiptUrl,
      "https://drive.example/file-1",
    );
    assert.equal(
      saved.calls.count,
      1,
    );
  },
);


test(
  "requires confirmation for low-confidence OCR and deduplicates",
  async () => {
    const saved =
      storage();
    const pipeline =
      new WhatsAppReceiptPipeline(
        downloader(),
        {
          async extractReceipt(){
            return {
              status:"success" as const,
              provider:"groq-vision",
              value:{
                rawText:"RM ?",
                confidence:0.4,
                latencyMs:4,
                model:"qwen/qwen3.6-27b",
              },
            };
          },
        },
        saved,
      );

    const input = {
      workspaceId:"workspace-1",
      instanceName:"demo",
      messageId:"receipt-2",
      message:{key:{id:"receipt-2"}},
      media:image,
      receiptsFolderId:"folder-1",
    };

    assert.equal(
      (await pipeline.process(input)).status,
      "confirmation_required",
    );
    assert.equal(
      (await pipeline.process(input)).status,
      "duplicate",
    );
    assert.equal(
      saved.calls.count,
      0,
    );
  },
);


test(
  "ignores documents and videos without download, OCR, storage or bot work",
  async () => {
    const saved =
      storage();
    let visionCalls = 0;
    let downloadCalls = 0;
    const pipeline =
      new WhatsAppReceiptPipeline(
        {
          async download(){
            downloadCalls += 1;
            throw new Error("must not download unrelated media");
          },
        },
        {
          async extractReceipt(){
            visionCalls += 1;
            throw new Error("must not OCR document");
          },
        },
        saved,
      );

    for(const media of [
      {
        kind:"document" as const,
        mimeType:"application/pdf",
        fileName:"family-document.pdf",
      },
      {
        kind:"video" as const,
        mimeType:"video/mp4",
        fileName:"family-video.mp4",
      },
    ]){
      const result = await pipeline.process({
        workspaceId:"workspace-1",
        instanceName:"demo",
        messageId:`media-${media.kind}`,
        message:{key:{id:`media-${media.kind}`}},
        media,
        receiptsFolderId:"folder-1",
      });

      assert.deepEqual(result, {
        status:"ignored",
        source:"RECEIPT",
        reason:"NON_RECEIPT_MEDIA_IGNORED",
      });
    }
    assert.equal(downloadCalls, 0);
    assert.equal(
      visionCalls,
      0,
    );
    assert.equal(
      saved.calls.count,
      0,
    );
  },
);


test(
  "silently ignores an ordinary image classified as not a receipt",
  async () => {
    const saved = storage();
    let scanCalls = 0;
    const pipeline = new WhatsAppReceiptPipeline(
      downloader(),
      {
        async extractReceipt(){
          return {
            status:"success" as const,
            provider:"groq-vision",
            value:{
              documentKind:"NOT_RECEIPT" as const,
              receiptEvidence:[],
              rawText:"JOIN US NOW IMAI.MY",
              confidence:0.99,
              latencyMs:8,
              model:"vision-model",
            },
          };
        },
      },
      saved,
      0.75,
      60_000,
      {
        async scan(){
          scanCalls += 1;
          throw new Error("non-receipt media must not enter scanner");
        },
      },
    );

    const result = await pipeline.process({
      workspaceId:"workspace-1",
      instanceName:"demo",
      messageId:"family-photo-1",
      message:{key:{id:"family-photo-1"}},
      media:image,
      receiptsFolderId:"",
    });

    assert.deepEqual(result, {
      status:"ignored",
      source:"RECEIPT",
      reason:"NON_RECEIPT_IMAGE_IGNORED",
    });
    assert.equal(saved.calls.count, 0);
    assert.equal(scanCalls, 0);
  },
);


test(
  "accepts only a classified receipt with transaction and payable-total evidence",
  async () => {
    const pipeline = new WhatsAppReceiptPipeline(
      downloader(),
      {
        async extractReceipt(){
          return {
            status:"success" as const,
            provider:"groq-vision",
            value:{
              documentKind:"RECEIPT" as const,
              receiptEvidence:["receipt paper", "TOTAL RM59.00", "Invoice No"],
              amount:"59.00",
              currency:"MYR",
              merchantName:"AEON CO. (M) BHD",
              rawText:"AEON CO. (M) BHD\nTOTAL AFTER ADJ RM59.00\nVISA RM59.00\nINVOICE NO 260808",
              confidence:0.95,
              latencyMs:9,
              model:"vision-model",
            },
          };
        },
      },
      storage(),
    );

    const result = await pipeline.process({
      workspaceId:"workspace-1",
      instanceName:"demo",
      messageId:"aeon-receipt-1",
      message:{key:{id:"aeon-receipt-1"}},
      media:image,
      receiptsFolderId:"folder-1",
    });

    assert.equal(result.status, "draft_ready");
  },
);


test(
  "checks the Drive folder only after the image is proven to be a receipt",
  async () => {
    const pipeline =
      new WhatsAppReceiptPipeline(
        downloader(),
        {
          async extractReceipt(){
            return {
              status:"success" as const,
              provider:"groq-vision",
              value:{
                documentKind:"RECEIPT" as const,
                receiptEvidence:["receipt paper", "TOTAL RM12.50"],
                amount:"12.50",
                merchantName:"Kedai Makan",
                rawText:"KEDAI MAKAN\nTOTAL RM12.50\nCASH",
                confidence:0.95,
                latencyMs:4,
                model:"vision-model",
              },
            };
          },
        },
        storage(),
      );

    const result =
      await pipeline.process({
        workspaceId:"workspace-1",
        instanceName:"demo",
        messageId:"receipt-3",
        message:{key:{id:"receipt-3"}},
        media:image,
        receiptsFolderId:"",
      });

    assert.deepEqual(
      result,
      {
        status:"failed",
        source:"RECEIPT",
        reason:"RECEIPT_FOLDER_NOT_CONFIGURED",
      },
    );
  },
);
