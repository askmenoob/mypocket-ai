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
    let routedTranscript = "";
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
    service.routeVoiceTranscript =
      async (_normalized:any, transcript:string) => {
        routedTranscript = transcript;
        return {message:"text route"};
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
      "WhatsApp voice routed to text pipeline",
    );
    assert.equal(
      routedTranscript,
      "bayar makan RM 12",
    );
    assert.equal(
      reply,
      "",
    );
    assert.equal(
      transactionCalls,
      0,
    );
  },
);

test(
  "voice route accepts bot rekod prefix and adds WhatsApp trigger",
  async () => {
    const service =
      createService();

    let routedPayload:any = null;
    service.handleEvolutionWebhook =
      async (input:any) => {
        routedPayload = input;
        return {message:"text route"};
      };

    await service.routeVoiceTranscript(
      {
        instanceName:"demo",
        messageId:"voice-prefix-1",
        remoteJid:"60123456789@s.whatsapp.net",
        participantJid:undefined,
      },
      "bot rekod 'beli KFC RM150'",
    );

    assert.equal(
      routedPayload.data.message.conversation,
      "!beli KFC RM150",
    );
  },
);
