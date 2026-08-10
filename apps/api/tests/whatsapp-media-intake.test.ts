import assert from "node:assert/strict";
import test from "node:test";

import {
  extractEvolutionMedia,
} from "../src/modules/whatsapp/whatsapp-media.js";


import {
  WhatsAppService,
} from "../src/modules/whatsapp/whatsapp.service.js";


test(
  "classifies Evolution image metadata without exposing media bytes",
  () => {
    const media =
      extractEvolutionMedia({
        imageMessage:{
          mimetype:"image/jpeg",
          fileLength:"128",
          caption:"receipt",
          url:"https://example.invalid/private-media",
        },
      });


    assert.deepEqual(
      media,
      {
        kind:"image",
        mimeType:"image/jpeg",
        fileLength:128,
        caption:"receipt",
      },
    );
  },
);


test(
  "classifies voice notes and preserves duration metadata",
  () => {
    assert.deepEqual(
      extractEvolutionMedia({
        audioMessage:{
          mimetype:"audio/ogg; codecs=opus",
          seconds:3,
          ptt:true,
        },
      }),
      {
        kind:"audio",
        mimeType:"audio/ogg; codecs=opus",
        durationSeconds:3,
      },
    );
  },
);


test(
  "text-only messages remain text input",
  () => {
    const service =
      new WhatsAppService(
        {} as any,
      );


    const normalized =
      (service as any)
        .normalizeEvolutionPayload({
          event:"messages.upsert",
          instance:"demo",
          data:{
            key:{
              fromMe:false,
              remoteJid:"60123456789@s.whatsapp.net",
              id:"text-1",
            },
            message:{
              conversation:"!status",
            },
          },
        });


    assert.equal(
      normalized.accepted,
      true,
    );

    assert.equal(
      normalized.messageType,
      "text",
    );

    assert.equal(
      normalized.text,
      "!status",
    );
  },
);


test(
  "media-only messages stop before command execution",
  () => {
    const service =
      new WhatsAppService(
        {} as any,
      );


    const normalized =
      (service as any)
        .normalizeEvolutionPayload({
          event:"messages.upsert",
          instance:"demo",
          data:{
            key:{
              fromMe:false,
              remoteJid:"60123456789@s.whatsapp.net",
              id:"audio-1",
            },
            message:{
              audioMessage:{
                mimetype:"audio/ogg; codecs=opus",
                seconds:2,
              },
            },
          },
        });


    assert.equal(
      normalized.accepted,
      false,
    );

    assert.equal(
      normalized.reason,
      "MEDIA_INPUT_PENDING_PIPELINE",
    );

    assert.equal(
      normalized.messageType,
      "audio",
    );

    assert.equal(
      normalized.media.kind,
      "audio",
    );
  },
);
