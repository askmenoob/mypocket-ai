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
    assert.match(
      request!.messages[0].content[1].image_url.url,
      /^data:image\/jpeg;base64,/,
    );
    assert.deepEqual(
      request!.response_format,
      {type:"json_object"},
    );
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
