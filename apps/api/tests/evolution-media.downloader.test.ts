import assert from "node:assert/strict";
import test from "node:test";

import {
  EvolutionMediaDownloader,
} from "../src/modules/whatsapp/evolution-media.downloader.js";


test(
  "downloads and decodes Evolution base64 media",
  async () => {
    let requestBody:Record<string, unknown> | null = null;
    const downloader =
      new EvolutionMediaDownloader({
        apiUrl:"https://evolution.example",
        apiKey:"test-key",
        fetchImpl:async (url, init) => {
          assert.equal(
            url,
            "https://evolution.example/chat/getBase64FromMediaMessage/demo",
          );
          requestBody =
            JSON.parse(
              String(init?.body),
            );
          return new Response(
            JSON.stringify({
              base64:Buffer.from("voice-data").toString("base64"),
              mimetype:"audio/ogg",
              fileName:"voice.ogg",
            }),
            {status:200},
          );
        },
      });

    const result =
      await downloader.download({
        instanceName:"demo",
        message:{
          key:{id:"message-1"},
          message:{audioMessage:{}},
        },
      });

    assert.equal(
      result.status,
      "success",
    );
    if(result.status !== "success"){
      return;
    }
    assert.equal(
      new TextDecoder().decode(result.value.bytes),
      "voice-data",
    );
    assert.equal(
      result.value.mimeType,
      "audio/ogg",
    );
    assert.equal(
      (requestBody as any).convertToMp4,
      false,
    );
  },
);


test(
  "fails closed on missing key, invalid base64 and oversized media",
  async () => {
    const unavailable =
      new EvolutionMediaDownloader({
        apiUrl:"https://evolution.example",
      });
    assert.equal(
      (await unavailable.download({
        instanceName:"demo",
        message:{key:{id:"m"}},
      })).reason,
      "EVOLUTION_MEDIA_CONFIGURATION_MISSING",
    );

    const invalid =
      new EvolutionMediaDownloader({
        apiUrl:"https://evolution.example",
        apiKey:"test-key",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({base64:"not base64!"}),
            {status:200},
          ),
      });
    assert.equal(
      (await invalid.download({
        instanceName:"demo",
        message:{key:{id:"m"}},
      })).reason,
      "EVOLUTION_MEDIA_BASE64_INVALID",
    );

    const oversized =
      new EvolutionMediaDownloader({
        apiUrl:"https://evolution.example",
        apiKey:"test-key",
        maxBytes:2,
        fetchImpl:async () =>
          new Response(
            JSON.stringify({base64:Buffer.from("123").toString("base64")}),
            {status:200},
          ),
      });
    assert.equal(
      (await oversized.download({
        instanceName:"demo",
        message:{key:{id:"m"}},
      })).reason,
      "EVOLUTION_MEDIA_TOO_LARGE",
    );
  },
);
