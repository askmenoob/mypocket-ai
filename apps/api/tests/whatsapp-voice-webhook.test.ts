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


function createService(
  botAlias = "bot",
){

  const app = {
    prisma:{
      whatsAppInstance:{
        findUnique:async () => ({
          workspaceId:"workspace-1",
          botAlias,
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
  "voice accepts the workspace bot alias dynamically",
  async () => {
    const service =
      createService(
        "mypocket",
      );

    let routedAlias = "";
    let routedTranscript = "";
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
        transcript:"mypocket rekod beli KFC RM150",
        confidence:0.96,
        latencyMs:11,
      }),
    };
    service.routeVoiceTranscript =
      async (_normalized:any, transcript:string, alias:string) => {
        routedTranscript = transcript;
        routedAlias = alias;
        return {message:"text route"};
      };

    const result =
      await service.handleEvolutionWebhook(
        payload,
      );

    assert.equal(
      result.message,
      "WhatsApp voice routed to text pipeline",
    );
    assert.equal(
      routedTranscript,
      "mypocket rekod beli KFC RM150",
    );
    assert.equal(
      routedAlias,
      "mypocket",
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
        transcript:"bot rekod bayar makan RM 12",
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
      "bot rekod bayar makan RM 12",
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
  "voice without a bot prefix is ignored without routing or replying",
  async () => {
    const service =
      createService();

    let routeCalls = 0;
    let replyCalls = 0;
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
        transcript:"jumpa saya selepas makan tengah hari",
        confidence:0.96,
        latencyMs:11,
      }),
    };
    service.routeVoiceTranscript =
      async () => {
        routeCalls += 1;
        return {message:"must not route"};
      };
    service.safeSendWebhookReply =
      async () => {
        replyCalls += 1;
      };

    const result =
      await service.handleEvolutionWebhook(
        payload,
      );

    assert.equal(
      result.message,
      "WhatsApp voice ignored without bot prefix",
    );
    assert.equal(
      result.normalized.reason,
      "VOICE_BOT_PREFIX_REQUIRED",
    );
    assert.equal(
      routeCalls,
      0,
    );
    assert.equal(
      replyCalls,
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


test(
  "voice route accepts a direct bot prefix without the word rekod",
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
        messageId:"voice-prefix-2",
        remoteJid:"60123456789@s.whatsapp.net",
        participantJid:undefined,
      },
      "bot beli KFC RM150",
    );

    assert.equal(
      routedPayload.data.message.conversation,
      "!beli KFC RM150",
    );
  },
);


test(
  "voice route strips the configured workspace alias",
  async () => {
    const service =
      createService(
        "mypocket",
      );

    let routedPayload:any = null;
    service.handleEvolutionWebhook =
      async (input:any) => {
        routedPayload = input;
        return {message:"text route"};
      };

    await service.routeVoiceTranscript(
      {
        instanceName:"demo",
        messageId:"voice-alias-1",
        remoteJid:"60123456789@s.whatsapp.net",
        participantJid:undefined,
      },
      "mypocket rekod beli KFC RM150",
      "mypocket",
    );

    assert.equal(
      routedPayload.data.message.conversation,
      "!beli KFC RM150",
    );
  },
);
