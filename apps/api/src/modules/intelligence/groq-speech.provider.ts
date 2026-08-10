import type {
  AIProviderResult,
} from "./ai-provider.types.js";


export interface SpeechToTextInput {

  audio:Uint8Array;

  mimeType:string;

  fileName:string;

  language?:string;

  prompt?:string;

}


export interface GroqSpeechTranscript {

  text:string;

  model:string;

  language?:string;

  durationSeconds?:number;

  confidence?:number;

  noSpeechProbability?:number;

  latencyMs:number;

}


type FetchLike =
  (
    input:string,
    init?:RequestInit,
  ) => Promise<Response>;


interface GroqSpeechProviderOptions {

  apiKey?:string;

  model:string;

  endpoint?:string;

  fetchImpl?:FetchLike;

  maxBytes?:number;

  defaultPrompt?:string;

}


const DEFAULT_MAX_BYTES =
  25 * 1024 * 1024;


const DEFAULT_PROMPT =
  "Transcribe exactly. The speaker may use Bahasa Melayu, English, or Manglish. Preserve names, amounts, currencies, dates, and merchant names. Do not translate or add commentary.";


export class GroqSpeechProvider {

  readonly name =
    "groq-speech";


  private readonly endpoint:string;

  private readonly fetchImpl:FetchLike;

  private readonly maxBytes:number;

  private readonly defaultPrompt:string;


  constructor(
    private readonly options:
      GroqSpeechProviderOptions,
  ){

    this.endpoint =
      options.endpoint
      ??
      "https://api.groq.com/openai/v1/audio/transcriptions";

    this.fetchImpl =
      options.fetchImpl
      ??
      fetch;

    this.maxBytes =
      options.maxBytes
      ??
      DEFAULT_MAX_BYTES;

    this.defaultPrompt =
      options.defaultPrompt
      ??
      DEFAULT_PROMPT;

  }


  isAvailable(){

    return Boolean(
      this.options.apiKey
      &&
      this.options.model,
    );

  }


  async transcribe(
    input:SpeechToTextInput,
  ):Promise<AIProviderResult<GroqSpeechTranscript>>{

    if(!this.isAvailable()){

      return {
        status:"unavailable",
        provider:this.name,
        reason:"GROQ_CONFIGURATION_MISSING",
      };

    }


    if(
      input.audio.byteLength === 0
    ){

      return {
        status:"invalid",
        provider:this.name,
        reason:"AUDIO_EMPTY",
      };

    }


    if(
      input.audio.byteLength >
      this.maxBytes
    ){

      return {
        status:"invalid",
        provider:this.name,
        reason:"AUDIO_TOO_LARGE",
      };

    }


    const form =
      new FormData();

    const audioBuffer =
      new ArrayBuffer(
        input.audio.byteLength,
      );

    new Uint8Array(
      audioBuffer,
    ).set(
      input.audio,
    );


    form.append(
      "file",
      new Blob(
        [audioBuffer],
        {
          type:
            input.mimeType
            ||
            "application/octet-stream",
        },
      ),
      input.fileName
      ||
      "voice.ogg",
    );

    form.append(
      "model",
      this.options.model,
    );

    form.append(
      "response_format",
      "verbose_json",
    );

    form.append(
      "temperature",
      "0",
    );

    form.append(
      "prompt",
      input.prompt
      ??
      this.defaultPrompt,
    );

    if(input.language){

      form.append(
        "language",
        input.language,
      );

    }


    const startedAt =
      Date.now();

    let response:Response;

    try{

      response =
        await this.fetchImpl(
          this.endpoint,
          {
            method:"POST",
            headers:{
              Authorization:
                `Bearer ${this.options.apiKey}`,
            },
            body:form,
          },
        );

    }catch{

      return {
        status:"failed",
        provider:this.name,
        reason:"GROQ_STT_REQUEST_FAILED",
      };

    }


    const latencyMs =
      Date.now()
      -
      startedAt;

    if(!response.ok){

      return {
        status:"failed",
        provider:this.name,
        reason:
          `GROQ_STT_HTTP_${response.status}`,
      };

    }


    let payload:unknown;

    try{

      payload =
        await response.json();

    }catch{

      return {
        status:"invalid",
        provider:this.name,
        reason:"GROQ_STT_RESPONSE_NOT_JSON",
      };

    }


    const root =
      this.asRecord(
        payload,
      );

    const text =
      this.asString(
        root.text,
      );

    if(!text){

      return {
        status:"invalid",
        provider:this.name,
        reason:"GROQ_STT_TRANSCRIPT_EMPTY",
      };

    }


    const segments =
      Array.isArray(root.segments)
        ?
        root.segments
        :
        [];

    const noSpeechProbabilities =
      segments
        .map(
          (segment) =>
            this.asFiniteNumber(
              this.asRecord(segment)
                .no_speech_prob,
            ),
        )
        .filter(
          (value):value is number =>
            value !== undefined,
        );

    const noSpeechProbability =
      noSpeechProbabilities.length > 0
        ?
        noSpeechProbabilities
          .reduce(
            (sum, value) =>
              sum + value,
            0,
          )
          /
          noSpeechProbabilities.length
        :
        undefined;

    const confidence =
      noSpeechProbability === undefined
        ?
        undefined
        :
        Math.max(
          0,
          Math.min(
            1,
            1 - noSpeechProbability,
          ),
        );

    const durationSeconds =
      this.asFiniteNumber(
        root.duration,
      );

    const language =
      this.asString(
        root.language,
      );

    return {
      status:"success",
      provider:this.name,
      value:{
        text,
        model:this.options.model,
        ...(language
          ? {language}
          : {}),
        ...(durationSeconds !== undefined
          ? {durationSeconds}
          : {}),
        ...(confidence !== undefined
          ? {confidence}
          : {}),
        ...(noSpeechProbability !== undefined
          ? {noSpeechProbability}
          : {}),
        latencyMs,
      },
    };

  }


  private asRecord(
    value:unknown,
  ):Record<string, unknown>{

    return value !== null
      &&
      typeof value === "object"
      &&
      !Array.isArray(value)
        ?
        value as Record<string, unknown>
        :
        {};

  }


  private asString(
    value:unknown,
  ):string{

    return typeof value === "string"
      ?
      value.trim()
      :
      "";

  }


  private asFiniteNumber(
    value:unknown,
  ):number | undefined{

    const number =
      typeof value === "number"
        ?
        value
        :
        typeof value === "string"
          ?
          Number(value)
          :
          NaN;

    return Number.isFinite(number)
      ?
      number
      :
      undefined;

  }

}
