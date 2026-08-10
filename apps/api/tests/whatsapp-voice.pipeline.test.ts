import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppVoicePipeline,
} from "../src/modules/whatsapp/whatsapp-voice.pipeline.js";


const media = {
  kind:"audio",
  mimeType:"audio/ogg",
  fileName:"voice.ogg",
} as const;


const downloader = {
  calls:0,
  async download(){
    this.calls += 1;
    return {
      status:"success" as const,
      provider:"evolution",
      value:{
        bytes:new Uint8Array([1, 2]),
        mimeType:"audio/ogg",
        fileName:"voice.ogg",
      },
    };
  },
};


test(
  "requires confirmation for low-confidence transcript and deduplicates message",
  async () => {
    const provider = {
      calls:0,
      async transcribe(){
        this.calls += 1;
        return {
          status:"success" as const,
          provider:"groq-speech",
          value:{
            text:"bayar makan RM 12",
            model:"whisper-large-v3-turbo",
            confidence:0.5,
            latencyMs:12,
          },
        };
      },
    };
    const pipeline =
      new WhatsAppVoicePipeline(
        downloader,
        provider,
      );

    const first =
      await pipeline.process({
        workspaceId:"workspace-1",
        instanceName:"demo",
        messageId:"message-1",
        message:{key:{id:"message-1"}},
        media,
      });

    assert.equal(
      first.status,
      "confirmation_required",
    );
    assert.equal(
      (first as any).reason,
      "VOICE_LOW_CONFIDENCE_CONFIRMATION",
    );

    const duplicate =
      await pipeline.process({
        workspaceId:"workspace-1",
        instanceName:"demo",
        messageId:"message-1",
        message:{key:{id:"message-1"}},
        media,
      });

    assert.deepEqual(
      duplicate,
      {
        status:"duplicate",
        source:"VOICE",
        reason:"VOICE_DUPLICATE_IGNORED",
      },
    );
    assert.equal(
      downloader.calls,
      1,
    );
    assert.equal(
      provider.calls,
      1,
    );
  },
);


test(
  "returns transcript_ready without executing a transaction",
  async () => {
    const pipeline =
      new WhatsAppVoicePipeline(
        downloader,
        {
          async transcribe(){
            return {
              status:"success" as const,
              provider:"groq-speech",
              value:{
                text:"income RM 100",
                model:"whisper-large-v3-turbo",
                confidence:0.95,
                latencyMs:8,
              },
            };
          },
        },
      );

    const result =
      await pipeline.process({
        workspaceId:"workspace-2",
        instanceName:"demo",
        messageId:"message-2",
        message:{key:{id:"message-2"}},
        media,
      });

    assert.equal(
      result.status,
      "transcript_ready",
    );
    assert.equal(
      (result as any).transcript,
      "income RM 100",
    );
  },
);


test(
  "does not route non-audio media through voice",
  async () => {
    const pipeline =
      new WhatsAppVoicePipeline(
        downloader,
        {
          async transcribe(){
            throw new Error("must not run");
          },
        },
      );

    assert.deepEqual(
      await pipeline.process({
        workspaceId:"workspace-1",
        instanceName:"demo",
        messageId:"image-1",
        message:{key:{id:"image-1"}},
        media:{kind:"image"},
      }),
      {
        status:"unsupported",
        source:"VOICE",
        reason:"VOICE_MEDIA_KIND_UNSUPPORTED",
      },
    );
  },
);
