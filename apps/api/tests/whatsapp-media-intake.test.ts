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


test(
  "self-sent group images without receipt intent stay outside the media pipeline",
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
              fromMe:true,
              remoteJid:"60132195990-1508049801@g.us",
              id:"self-receipt-1",
            },
            message:{
              imageMessage:{
                mimetype:"image/jpeg",
                fileName:"receipt.jpg",
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
      normalized.fromMe,
      true,
    );
    assert.equal(
      normalized.media.kind,
      "image",
    );
  },
);


test(
  "self-sent private images without a receipt trigger remain ignored",
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
              fromMe:true,
              remoteJid:"60123456789@s.whatsapp.net",
              id:"self-private-image-1",
            },
            message:{
              imageMessage:{
                mimetype:"image/jpeg",
                fileName:"photo.jpg",
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
      "MESSAGE_FROM_SELF",
    );
  },
);


test(
  "registered video and document messages are ignored before member lookup",
  async () => {
    for(const [messageId, message] of [
      ["video-1", {videoMessage:{mimetype:"video/mp4"}}],
      ["document-1", {documentMessage:{mimetype:"application/pdf", fileName:"family.pdf"}}],
    ] as const){
      const service = new WhatsAppService({
        prisma:{
          whatsAppInstance:{
            async findUnique(){
              return {
                workspaceId:"workspace-1",
                phoneNumber:"60100000000",
              };
            },
          },
        },
      } as any);
      (service as any).findWebhookActorMember = async () => {
        throw new Error("must not identify a human for unrelated media");
      };

      const result = await service.handleEvolutionWebhook({
        event:"messages.upsert",
        instance:"demo",
        data:{
          key:{
            fromMe:false,
            remoteJid:"60123456789@s.whatsapp.net",
            id:messageId,
          },
          message,
        },
      });

      assert.equal(result.message, "WhatsApp media ignored");
      assert.equal((result.normalized as any).reason, "NON_RECEIPT_MEDIA_IGNORED");
    }
  },
);


test(
  "group images without an explicit receipt trigger are ignored before actor lookup",
  async () => {
    let actorLookups = 0;
    let pipelineCalls = 0;
    const service = new WhatsAppService({
      prisma:{
        whatsAppInstance:{
          async findUnique(){
            return {
              workspaceId:"workspace-1",
              phoneNumber:"60100000000",
              botAlias:"mypocket",
            };
          },
        },
      },
    } as any) as any;
    service.findWebhookActorMember = async () => {
      actorLookups += 1;
      return {userId:"user-1", role:"OWNER"};
    };
    service.receiptPipeline = {
      process:async () => {
        pipelineCalls += 1;
        throw new Error("unrelated group media must not reach receipt processing");
      },
    };

    const result = await service.handleEvolutionWebhook({
      event:"messages.upsert",
      instance:"demo",
      data:{
        key:{
          fromMe:false,
          remoteJid:"60132195990-1508049801@g.us",
          participant:"60123456789@s.whatsapp.net",
          id:"group-family-photo-1",
        },
        message:{
          imageMessage:{
            mimetype:"image/jpeg",
            fileName:"family.jpg",
          },
        },
      },
    });

    assert.equal(result.message, "WhatsApp media ignored");
    assert.equal(
      (result.normalized as any).reason,
      "GROUP_MEDIA_RECEIPT_INTENT_REQUIRED",
    );
    assert.equal(actorLookups, 0);
    assert.equal(pipelineCalls, 0);
  },
);


test(
  "group receipt triggers and the configured alias may enter receipt processing",
  async () => {
    for(const caption of [
      "!resit petrol",
      "@mypocket rekod resit ini",
    ]){
      let pipelineCalls = 0;
      const service = new WhatsAppService({
        prisma:{
          whatsAppInstance:{
            async findUnique(){
              return {
                workspaceId:"workspace-1",
                phoneNumber:"60100000000",
                botAlias:"mypocket",
              };
            },
          },
          workspaceGoogleSetting:{
            async findUnique(){
              return {receiptsFolderId:"receipts-folder"};
            },
          },
        },
      } as any) as any;
      service.findWebhookActorMember = async () => ({
        userId:"user-1",
        role:"OWNER",
      });
      service.hasActiveBillingAccess = async () => true;
      service.getWorkspaceReplyLanguage = async () => "ms";
      service.safeSendWebhookReply = async () => {};
      service.transactionService = {
        getSheetCategoryNames:async () => [],
        getSheetTransactions:async () => [],
      };
      service.receiptPipeline = {
        process:async () => {
          pipelineCalls += 1;
          return {
            status:"ignored",
            source:"RECEIPT",
            reason:"NOT_A_RECEIPT",
          };
        },
      };

      const result = await service.handleEvolutionWebhook({
        event:"messages.upsert",
        instance:"demo",
        data:{
          key:{
            fromMe:false,
            remoteJid:"60132195990-1508049801@g.us",
            participant:"60123456789@s.whatsapp.net",
            id:`group-receipt-${caption}`,
          },
          message:{
            imageMessage:{
              mimetype:"image/jpeg",
              fileName:"receipt.jpg",
              caption,
            },
          },
        },
      });

      assert.equal(result.message, "WhatsApp receipt input ignored");
      assert.equal(pipelineCalls, 1);
    }
  },
);
