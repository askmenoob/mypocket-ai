import type {
  AIProviderResult,
} from "../intelligence/ai-provider.types.js";


import type {
  GroqSpeechTranscript,
  SpeechToTextInput,
} from "../intelligence/groq-speech.provider.js";


import type {
  EvolutionMediaDescriptor,
} from "./whatsapp-media.js";


import {
  WhatsAppVoiceIdempotencyStore,
} from "./whatsapp-voice.idempotency.js";


export interface VoiceMediaDownloader {

  download(
    input:{
      instanceName:string;
      message:Record<string, unknown>;
    },
  ):Promise<{
    status:"success";
    provider:string;
    value:{
      bytes:Uint8Array;
      mimeType:string;
      fileName:string;
    };
  } | {
    status:"unavailable" | "failed" | "invalid";
    provider:string;
    reason:string;
  }>;

}


export interface VoiceSpeechProvider {

  transcribe(
    input:SpeechToTextInput,
  ):Promise<AIProviderResult<GroqSpeechTranscript>>;

}


export type WhatsAppVoicePipelineResult =
  | {
      status:"duplicate";
      source:"VOICE";
      reason:"VOICE_DUPLICATE_IGNORED";
    }
  | {
      status:"unsupported";
      source:"VOICE";
      reason:"VOICE_MEDIA_KIND_UNSUPPORTED";
    }
  | {
      status:"failed";
      source:"VOICE";
      reason:string;
    }
  | {
      status:"confirmation_required" | "transcript_ready";
      source:"VOICE";
      provider:string;
      model:string;
      transcript:string;
      confidence?:number;
      latencyMs:number;
      reason?:"VOICE_LOW_CONFIDENCE_CONFIRMATION";
    };


const DEFAULT_CONFIDENCE_THRESHOLD =
  0.8;


export class WhatsAppVoicePipeline {

  constructor(
    private readonly downloader:VoiceMediaDownloader,
    private readonly speechProvider:VoiceSpeechProvider,
    private readonly idempotency:
      WhatsAppVoiceIdempotencyStore =
        new WhatsAppVoiceIdempotencyStore(),
    private readonly confidenceThreshold =
      DEFAULT_CONFIDENCE_THRESHOLD,
  ){}


  async process(
    input:{
      workspaceId:string;
      instanceName:string;
      messageId:string;
      message:Record<string, unknown>;
      media:EvolutionMediaDescriptor;
    },
  ):Promise<WhatsAppVoicePipelineResult>{

    if(
      input.media.kind !== "audio"
    ){

      return {
        status:"unsupported",
        source:"VOICE",
        reason:"VOICE_MEDIA_KIND_UNSUPPORTED",
      };

    }


    if(
      this.idempotency.has(
        input.workspaceId,
        input.messageId,
      )
    ){

      return {
        status:"duplicate",
        source:"VOICE",
        reason:"VOICE_DUPLICATE_IGNORED",
      };

    }


    const downloaded =
      await this.downloader.download({
        instanceName:
          input.instanceName,
        message:
          input.message,
      });

    if(downloaded.status !== "success"){

      return {
        status:"failed",
        source:"VOICE",
        reason:
          downloaded.reason,
      };

    }


    const transcribed =
      await this.speechProvider.transcribe({
        audio:
          downloaded.value.bytes,
        mimeType:
          downloaded.value.mimeType
          ||
          input.media.mimeType
          ||
          "audio/ogg",
        fileName:
          downloaded.value.fileName
          ||
          input.media.fileName
          ||
          "voice.ogg",
      });

    if(transcribed.status !== "success"){

      return {
        status:"failed",
        source:"VOICE",
        reason:
          transcribed.reason,
      };

    }


    this.idempotency.mark(
      input.workspaceId,
      input.messageId,
    );


    const value =
      transcribed.value;

    const lowConfidence =
      value.confidence === undefined
      ||
      value.confidence <
      this.confidenceThreshold;

    if(lowConfidence){

      return {
        status:"confirmation_required",
        source:"VOICE",
        provider:
          transcribed.provider,
        model:
          value.model,
        transcript:
          value.text,
        ...(value.confidence !== undefined
          ? {confidence:value.confidence}
          : {}),
        latencyMs:
          value.latencyMs,
        reason:
          "VOICE_LOW_CONFIDENCE_CONFIRMATION",
      };

    }


    return {
      status:"transcript_ready",
      source:"VOICE",
      provider:
        transcribed.provider,
      model:
        value.model,
      transcript:
        value.text,
      confidence:
        value.confidence,
      latencyMs:
        value.latencyMs,
    };

  }

}
