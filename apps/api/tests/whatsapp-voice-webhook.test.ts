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
      id:"voice-1",
    },
    message:{
      audioMessage:{
        mimetype:"audio/ogg",
        seconds:2,
      },
    },
  },
};


function createService(){

  const app = {
    prisma:{
      whatsAppInstance:{
        findUnique:async () => ({
          workspaceId:"workspace-1",
        }),
      },
    },
  };

  return new WhatsAppService(
    app as any,
  ) as any;

}


test(
  "unlinked voice sender is rejected before media provider execution",
  async () => {
    const service =
      createService();

    let pipelineCalls = 0;
    service.voicePipeline = {
      process:async () => {
        pipelineCalls += 1;
        throw new Error("must not execute");
      },
    };
    service.findWebhookActorMember =
      async () => null;

    const result =
      await service.handleEvolutionWebhook(
        payload,
      );

    assert.equal(
      result.source,
      "EVOLUTION",
    );
    assert.equal(
      result.normalized.reason,
      "WHATSAPP_MEMBER_PHONE_NOT_LINKED",
    );
    assert.equal(
      pipelineCalls,
      0,
    );
  },
);


test(
  "linked voice sender receives transcript response without financial execution",
  async () => {
    const service =
      createService();

    let reply = "";
    let transactionCalls = 0;
    service.findWebhookActorMember =
      async () => ({
        userId:"user-1",
        role:"MEMBER",
      });
    service.voicePipeline = {
      process:async () => ({
        status:"transcript_ready",
        source:"VOICE",
        provider:"groq-speech",
        model:"whisper-large-v3-turbo",
        transcript:"bayar makan RM 12",
        confidence:0.95,
        latencyMs:11,
      }),
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
      "VOICE",
    );
    assert.equal(
      result.message,
      "WhatsApp voice transcript ready",
    );
    assert.match(
      reply,
      /bayar makan RM 12/,
    );
    assert.equal(
      transactionCalls,
      0,
    );
  },
);
