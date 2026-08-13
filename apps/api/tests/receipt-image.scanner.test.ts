import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  SmartReceiptImageScanner,
} from "../src/modules/whatsapp/receipt-image.scanner.js";
import {
  WhatsAppReceiptPipeline,
} from "../src/modules/whatsapp/whatsapp-receipt.pipeline.js";


async function receiptLikePng():Promise<Uint8Array>{
  const bytes = await sharp({
    create:{
      width:720,
      height:1200,
      channels:3,
      background:"#d8d1c4",
    },
  })
    .composite([
      {
        input:Buffer.from(
          `<svg width="560" height="1040">
            <rect width="560" height="1040" fill="white"/>
            <text x="70" y="130" font-size="38" fill="black">KEDAI TEST</text>
            <text x="70" y="900" font-size="42" fill="black">TOTAL RM 42.50</text>
          </svg>`,
        ),
        left:80,
        top:80,
      },
    ])
    .png()
    .toBuffer();

  return new Uint8Array(bytes);
}


async function perspectiveReceiptPng():Promise<Uint8Array>{
  const receipt = await sharp({
    create:{
      width:520,
      height:900,
      channels:3,
      background:"#ffffff",
    },
  })
    .composite([{
      input:Buffer.from(
        `<svg width="520" height="900">
          <text x="55" y="110" font-size="38" fill="black">PERSPECTIVE MART</text>
          <text x="55" y="760" font-size="46" fill="black">TOTAL RM 88.00</text>
        </svg>`,
      ),
      left:0,
      top:0,
    }])
    .png()
    .toBuffer();
  const skewed = await sharp(receipt)
    .affine([
      [1, 0.12],
      [-0.08, 1],
    ], {background:"#ffffff"})
    .resize(470, 820, {fit:"fill"})
    .png()
    .toBuffer();
  return new Uint8Array(
    await sharp({
      create:{width:820, height:1120, channels:3, background:"#746554"},
    })
      .composite([{input:skewed, left:170, top:150}])
      .png()
      .toBuffer(),
  );
}


test(
  "smart scanner produces an enhanced PNG and a one-page PDF archive",
  async () => {
    const scanner = new SmartReceiptImageScanner();
    const result = await scanner.scan({
      bytes:await receiptLikePng(),
      mimeType:"image/png",
      fileName:"phone receipt.png",
    });

    assert.equal(result.status, "success");
    assert.equal(result.ocrMedia.mimeType, "image/png");
    assert.match(result.ocrMedia.fileName, /phone-receipt-scan\.png$/);
    assert.equal(result.archiveMedia.mimeType, "application/pdf");
    assert.match(result.archiveMedia.fileName, /phone-receipt-scan\.pdf$/);
    assert.equal(
      Buffer.from(result.archiveMedia.bytes.slice(0, 4)).toString("ascii"),
      "%PDF",
    );
    assert.equal(result.enhanced, true);
  },
);


test(
  "smart scanner skips PDF generation when workspace keeps cleaned images",
  async () => {
    const scanner = new SmartReceiptImageScanner();
    const result = await scanner.scan(
      {
        bytes:await receiptLikePng(),
        mimeType:"image/png",
        fileName:"image preference.png",
      },
      {outputFormat:"image"},
    );

    assert.equal(result.archiveMedia.mimeType, "image/png");
    assert.match(result.archiveMedia.fileName, /image-preference-scan\.png$/);
    assert.deepEqual(result.archiveMedia.bytes, result.ocrMedia.bytes);
  },
);


test(
  "smart scanner removes a large background and applies four-corner correction",
  async () => {
    const scanner = new SmartReceiptImageScanner();
    const result = await scanner.scan({
      bytes:await perspectiveReceiptPng(),
      mimeType:"image/png",
      fileName:"perspective receipt.png",
    });
    const metadata = await sharp(result.ocrMedia.bytes).metadata();

    assert.equal(result.boundaryDetected, true);
    assert.equal(result.perspectiveCorrected, true);
    assert.ok((metadata.width ?? 0) < 820);
    assert.ok((metadata.height ?? 0) < 1120);
    assert.equal(
      Buffer.from(result.archiveMedia.bytes.slice(0, 4)).toString("ascii"),
      "%PDF",
    );
  },
);


test(
  "pipeline classifies the original before scanning and retains only PDF pending confirm",
  async () => {
    const original = await receiptLikePng();
    const metrics:string[] = [];
    let visionMimeType = "";
    let visionFileName = "";
    let storageCalls = 0;
    const pipeline = new WhatsAppReceiptPipeline(
      {
        async download(){
          return {
            status:"success" as const,
            provider:"evolution",
            value:{
              bytes:original,
              mimeType:"image/png",
              fileName:"aeon.png",
            },
          };
        },
      },
      {
        async extractReceipt(input){
          visionMimeType = input.mimeType;
          visionFileName = input.fileName;
          return {
            status:"success" as const,
            provider:"groq-vision",
            value:{
              documentKind:"RECEIPT" as const,
              merchantName:"AEON CO. (M) BHD",
              amount:"59.00",
              currency:"MYR",
              rawText:"TOTAL AFTER ADJ RM59.00",
              receiptEvidence:[
                "AEON CO. (M) BHD merchant header",
                "TOTAL AFTER ADJ RM59.00",
              ],
              confidence:0.96,
              latencyMs:10,
              model:"test-model",
            },
          };
        },
      },
      {
        async store(){
          storageCalls += 1;
          throw new Error("must not upload before !confirm");
        },
      },
      0.75,
      60_000,
      new SmartReceiptImageScanner(),
      metric => metrics.push(metric),
    );

    const result = await pipeline.process({
      workspaceId:"workspace-1",
      instanceName:"demo",
      messageId:"scanner-pipeline-1",
      message:{key:{id:"scanner-pipeline-1"}},
      media:{kind:"image", mimeType:"image/png", fileName:"aeon.png"},
      receiptsFolderId:"receipts-folder",
    });

    assert.equal(result.status, "draft_ready");
    assert.equal(visionMimeType, "image/png");
    assert.equal(visionFileName, "aeon.png");
    assert.equal((result as any).pendingUpload.mimeType, "application/pdf");
    assert.match((result as any).pendingUpload.fileName, /aeon-scan\.pdf$/);
    assert.equal(storageCalls, 0);
    assert.deepEqual(metrics, [
      "classification_request",
      "classified_receipt",
      "scan_success",
      "pdf_generated",
    ]);
  },
);


test(
  "pipeline retains a cleaned image when the workspace disables PDF conversion",
  async () => {
    const original = await receiptLikePng();
    const metrics:string[] = [];
    const pipeline = new WhatsAppReceiptPipeline(
      {
        async download(){
          return {
            status:"success" as const,
            provider:"evolution",
            value:{bytes:original, mimeType:"image/png", fileName:"receipt.png"},
          };
        },
      },
      {
        async extractReceipt(){
          return {
            status:"success" as const,
            provider:"groq-vision",
            value:{
              documentKind:"RECEIPT" as const,
              merchantName:"KEDAI TEST",
              amount:"42.50",
              currency:"MYR",
              rawText:"KEDAI TEST\nTOTAL RM42.50\nCASH",
              receiptEvidence:["KEDAI TEST", "TOTAL RM42.50"],
              confidence:0.96,
              latencyMs:10,
              model:"test-model",
            },
          };
        },
      },
      {async store(){throw new Error("must not upload before !confirm");}},
      0.75,
      60_000,
      new SmartReceiptImageScanner(),
      metric => metrics.push(metric),
    );

    const result = await pipeline.process({
      workspaceId:"workspace-1",
      instanceName:"demo",
      messageId:"image-output-1",
      message:{key:{id:"image-output-1"}},
      media:{kind:"image", mimeType:"image/png", fileName:"receipt.png"},
      receiptsFolderId:"receipts-folder",
      receiptOutputFormat:"image",
    });

    assert.equal(result.status, "draft_ready");
    assert.equal((result as any).pendingUpload.mimeType, "image/png");
    assert.match((result as any).pendingUpload.fileName, /receipt-scan\.png$/);
    assert.equal(metrics.includes("pdf_generated"), false);
  },
);


test(
  "invalid image signatures stop before vision while enhancement failure falls back safely",
  async () => {
    let visionCalls = 0;
    const makePipeline = (scanner:any, bytes:Uint8Array) =>
      new WhatsAppReceiptPipeline(
        {
          async download(){
            return {
              status:"success" as const,
              provider:"evolution",
              value:{bytes, mimeType:"image/jpeg", fileName:"receipt.jpg"},
            };
          },
        },
        {
          async extractReceipt(input){
            visionCalls += 1;
            assert.equal(input.mimeType, "image/jpeg");
            return {
              status:"success" as const,
              provider:"groq-vision",
              value:{
                documentKind:"RECEIPT" as const,
                amount:"10.00",
                currency:"MYR",
                rawText:"TOTAL RM10.00",
                merchantName:"Test Merchant",
                receiptEvidence:[
                  "Test Merchant header",
                  "TOTAL RM10.00",
                ],
                confidence:0.9,
                latencyMs:1,
                model:"test-model",
              },
            };
          },
        },
        {async store(){throw new Error("not expected");}},
        0.75,
        60_000,
        scanner,
      );

    const invalid = makePipeline(
      new SmartReceiptImageScanner(),
      new Uint8Array([1, 2, 3]),
    );
    const invalidResult = await invalid.process({
      workspaceId:"workspace-1",
      instanceName:"demo",
      messageId:"invalid-image",
      message:{},
      media:{kind:"image", mimeType:"image/jpeg", fileName:"receipt.jpg"},
      receiptsFolderId:"receipts-folder",
    });
    assert.equal(invalidResult.status, "failed");
    assert.equal((invalidResult as any).reason, "RECEIPT_IMAGE_SIGNATURE_INVALID");
    assert.equal(visionCalls, 0);

    const fallback = makePipeline(
      {async scan(){throw new Error("enhancement unavailable");}},
      new Uint8Array([0xff, 0xd8, 0xff]),
    );
    const fallbackResult = await fallback.process({
      workspaceId:"workspace-1",
      instanceName:"demo",
      messageId:"scanner-fallback",
      message:{},
      media:{kind:"image", mimeType:"image/jpeg", fileName:"receipt.jpg"},
      receiptsFolderId:"receipts-folder",
    });
    assert.equal(fallbackResult.status, "draft_ready");
    assert.equal((fallbackResult as any).pendingUpload.mimeType, "image/jpeg");
    assert.equal(visionCalls, 1);
  },
);
