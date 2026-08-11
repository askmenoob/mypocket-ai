import assert from "node:assert/strict";
import test from "node:test";

import {
  GroqVisionProvider,
} from "../src/modules/intelligence/groq-vision.provider.js";


test(
  "reports unavailable and rejects oversized or empty receipt image",
  async () => {
    const missing =
      new GroqVisionProvider({
        model:"qwen/qwen3.6-27b",
      });
    assert.equal(
      (await missing.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"receipt.jpg",
      })).reason,
      "GROQ_VISION_CONFIGURATION_MISSING",
    );

    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        maxBytes:2,
        fetchImpl:async () => {
          throw new Error("must not call network");
        },
      });
    assert.equal(
      (await provider.extractReceipt({
        image:new Uint8Array(),
        mimeType:"image/jpeg",
        fileName:"empty.jpg",
      })).reason,
      "RECEIPT_IMAGE_EMPTY",
    );
    assert.equal(
      (await provider.extractReceipt({
        image:new Uint8Array([1, 2, 3]),
        mimeType:"image/jpeg",
        fileName:"large.jpg",
      })).reason,
      "RECEIPT_IMAGE_TOO_LARGE",
    );
  },
);


test(
  "sends a data URL and normalizes receipt JSON",
  async () => {
    let request:Record<string, any> | null = null;
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async (_url, init) => {
          request =
            JSON.parse(
              String(init?.body),
            );
          return new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:"12,50",
                      currency:"MYR",
                      merchantName:"Kedai Makan",
                      receiptType:"DINING",
                      transactionDate:"2026-08-10",
                      description:"Lunch",
                      rawText:"KEDAI MAKAN RM12.50",
                      confidence:0.92,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          );
        },
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1, 2, 3]),
        mimeType:"image/jpeg",
        fileName:"receipt.jpg",
      });

    assert.equal(
      result.status,
      "success",
    );
    if(result.status !== "success"){
      return;
    }
    assert.equal(
      result.value.amount,
      "12.50",
    );
    assert.equal(
      result.value.confidence,
      0.92,
    );
    assert.equal(
      result.value.model,
      "qwen/qwen3.6-27b",
    );
    assert.equal(
      result.value.receiptType,
      "DINING",
    );
    assert.match(
      request!.messages[0].content[1].image_url.url,
      /^data:image\/jpeg;base64,/,
    );
    assert.deepEqual(
      request!.response_format,
      {type:"json_object"},
    );
    assert.match(
      request!.messages[0].content[0].text,
      /final amount actually paid/i,
    );
    assert.match(
      request!.messages[0].content[0].text,
      /YYYY-MM-DD/,
    );
    assert.match(
      request!.messages[0].content[0].text,
      /FUEL.*GROCERIES.*DINING/i,
    );
    assert.match(
      request!.messages[0].content[0].text,
      /merchantBrand.*purchaseDetails.*visualCues/i,
    );
    assert.match(
      request!.messages[0].content[0].text,
      /Shell logo.*legal merchant/i,
    );
  },
);


test(
  "prefers the final paid total over subtotal, tax, cash, and change",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:null,
                      currency:null,
                      merchantName:"Lotus's",
                      rawText:[
                        "SUBTOTAL RM217.80",
                        "SERVICE CHARGE RM3.00",
                        "TAX RM31.80",
                        "TOTAL RM252.60",
                        "CASH RM300.00",
                        "CHANGE RM47.40",
                      ].join("\n"),
                      confidence:0.61,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"lotus.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.amount, "252.60");
    assert.equal(result.value.currency, "RM");
  },
);


test(
  "recognizes Malay paid-total labels and decimal commas",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:null,
                      rawText:"JUMLAH DIBAYAR MYR 12,50",
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"receipt.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.amount, "12.50");
    assert.equal(result.value.currency, "MYR");
  },
);


test(
  "finds the paid total when OCR flattens the receipt into one line",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      rawText:"SUBTOTAL RM217.80 TOTAL RM252.60 CHANGE RM47.40",
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"receipt.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.amount, "252.60");
  },
);


test(
  "recognizes TL as a receipt total label at the start of a line",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:null,
                      currency:null,
                      merchantName:"Yik Mun",
                      rawText:[
                        "AMT-EXCL TAX RM63.40",
                        "SST 6% RM3.80",
                        "TL RM67.20",
                        "CASH RM100.00",
                        "CG RM32.80",
                      ].join("\n"),
                      confidence:0.7,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"yik-mun.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.amount, "67.20");
    assert.equal(result.value.currency, "RM");
  },
);


test(
  "uses strong receipt evidence to correct a fuel receipt classification",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:"341.92",
                      currency:"MYR",
                      merchantName:"Shell",
                      receiptType:"RETAIL",
                      rawText:[
                        "Shell",
                        "Pump 1  FS Diesel",
                        "RM 4.070/L  84.010 L",
                        "Grand Total 341.92",
                      ].join("\n"),
                      confidence:0.94,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"shell.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.receiptType, "FUEL");
    assert.equal(result.value.classificationSource, "EVIDENCE");
  },
);


test(
  "classifies a MANKON legal-merchant receipt as fuel from pump and diesel details",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:"390.00",
                      currency:"MYR",
                      merchantName:"MANKON PHOENIX ENTERPRISE",
                      receiptType:"RETAIL",
                      referenceNumber:"8ba50b",
                      receiptNumber:"613694",
                      purchaseDetails:
                        "FS Diesel, Pump 8, 85.340 L @ RM4.570/L",
                      rawText:[
                        "MANKON PHOENIX ENTERPRISE",
                        "Card Name Shellcard",
                        "FS Diesel(Pump 8) RM390.00",
                        "85.340ltr@RM4.570/ltr",
                        "TOTAL RM390.00",
                      ].join("\n"),
                      confidence:0.95,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"mankon-shell-diesel.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.receiptType, "FUEL");
    assert.equal(result.value.classificationSource, "EVIDENCE");
    assert.equal(result.value.receiptReference, "8ba50b");
    assert.equal(
      result.value.purchaseDetails,
      "FS Diesel, Pump 8, 85.340 L @ RM4.570/L",
    );
  },
);


test(
  "uses a detected Shell logo as fuel evidence when the legal merchant has another name",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:"390.00",
                      currency:"MYR",
                      merchantName:"MANKON PHOENIX ENTERPRISE",
                      merchantBrand:"Shell",
                      visualCues:["Shell logo"],
                      receiptType:"RETAIL",
                      rawText:[
                        "MANKON PHOENIX ENTERPRISE",
                        "INVOICE",
                        "TOTAL RM390.00",
                      ].join("\n"),
                      confidence:0.88,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"mankon-shell-logo.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.merchantBrand, "Shell");
    assert.deepEqual(result.value.visualCues, ["Shell logo"]);
    assert.equal(result.value.receiptType, "FUEL");
    assert.equal(result.value.classificationSource, "EVIDENCE");
  },
);


test(
  "uses the detected brand when Groq returns only a registration identifier as merchant",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:"341.92",
                      currency:"MYR",
                      merchantName:"IP0148/23-D",
                      merchantBrand:"Shell",
                      receiptType:"FUEL",
                      receiptNumber:"597534",
                      rawText:
                        "FS Diesel Pump 1 RM4.070/L TOTAL RM341.92",
                      confidence:0.98,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"shell-cropped.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.merchantName, "Shell");
    assert.equal(result.value.merchantBrand, "Shell");
    assert.equal(result.value.receiptType, "FUEL");
    assert.equal(result.value.receiptReference, "597534");
  },
);


test(
  "retries once when Groq fails JSON validation and then succeeds",
  async () => {
    let requests = 0;
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () => {
          requests += 1;
          if(requests === 1){
            return new Response(
              JSON.stringify({
                error:{
                  code:"json_validate_failed",
                  message:"Failed to validate JSON",
                },
              }),
              {status:400},
            );
          }
          return new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:"341.92",
                      currency:"MYR",
                      merchantName:"Shell",
                      receiptType:"FUEL",
                      rawText:
                        "Shell Pump 1 FS Diesel TOTAL RM341.92",
                      confidence:0.98,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          );
        },
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"shell-retry.jpg",
      });

    assert.equal(requests, 2);
    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.receiptType, "FUEL");
    assert.equal(result.value.amount, "341.92");
  },
);


test(
  "does not treat an ordinary one-litre grocery item as fuel",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:JSON.stringify({
                      amount:"8.90",
                      currency:"MYR",
                      merchantName:"Lotus's",
                      receiptType:"GROCERIES",
                      purchaseDetails:"Fresh milk 1 L",
                      rawText:[
                        "LOTUS'S",
                        "FRESH MILK 1 L  RM8.90",
                        "TOTAL RM8.90",
                      ].join("\n"),
                      confidence:0.96,
                    }),
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    const result =
      await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"lotus-milk.jpg",
      });

    assert.equal(result.status, "success");
    if(result.status !== "success"){
      return;
    }
    assert.equal(result.value.receiptType, "GROCERIES");
    assert.notEqual(result.value.receiptType, "FUEL");
  },
);


test(
  "fails closed on malformed vision response",
  async () => {
    const provider =
      new GroqVisionProvider({
        apiKey:"test-key",
        model:"qwen/qwen3.6-27b",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({
              choices:[
                {
                  message:{
                    content:"not json",
                  },
                },
              ],
            }),
            {status:200},
          ),
      });

    assert.equal(
      (await provider.extractReceipt({
        image:new Uint8Array([1]),
        mimeType:"image/jpeg",
        fileName:"receipt.jpg",
      })).reason,
      "GROQ_VISION_CONTENT_INVALID_JSON",
    );
  },
);
