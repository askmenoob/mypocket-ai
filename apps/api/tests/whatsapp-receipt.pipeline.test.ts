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
  "creates a draft receipt with Drive URL and OCR extraction",
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
      "https://drive.example/file-1",
    );
    assert.equal(
      (result as any).extraction.amount,
      "12.50",
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
      1,
    );
  },
);


test(
  "stores documents without sending PDFs to image OCR",
  async () => {
    const saved =
      storage();
    let visionCalls = 0;
    const pipeline =
      new WhatsAppReceiptPipeline(
        downloader(),
        {
          async extractReceipt(){
            visionCalls += 1;
            throw new Error("must not OCR document");
          },
        },
        saved,
      );

    const result =
      await pipeline.process({
        workspaceId:"workspace-1",
        instanceName:"demo",
        messageId:"document-1",
        message:{key:{id:"document-1"}},
        media:{
          kind:"document",
          mimeType:"application/pdf",
          fileName:"receipt.pdf",
        },
        receiptsFolderId:"folder-1",
      });

    assert.equal(
      result.status,
      "stored_pending_ocr",
    );
    assert.equal(
      visionCalls,
      0,
    );
  },
);


test(
  "fails before media download when receipt folder is missing",
  async () => {
    const pipeline =
      new WhatsAppReceiptPipeline(
        {
          async download(){
            throw new Error("must not download");
          },
        },
        {
          async extractReceipt(){
            throw new Error("must not OCR");
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
