import type {
  AIProviderResult,
} from "./ai-provider.types.js";


export interface ReceiptVisionInput {

  image:Uint8Array;

  mimeType:string;

  fileName:string;

  prompt?:string;

}


export interface ReceiptVisionCandidate {

  amount?:string;

  currency?:string;

  merchantName?:string;

  transactionDate?:string;

  description?:string;

  rawText:string;

  confidence?:number;

  latencyMs:number;

  model:string;

}


type FetchLike =
  (
    input:string,
    init?:RequestInit,
  ) => Promise<Response>;


interface GroqVisionProviderOptions {

  apiKey?:string;

  model:string;

  endpoint?:string;

  fetchImpl?:FetchLike;

  maxBytes?:number;

  defaultPrompt?:string;

}


const DEFAULT_MAX_BYTES =
  20 * 1024 * 1024;


const DEFAULT_PROMPT =
  "Read this receipt or document. Return JSON only with amount, currency, merchantName, transactionDate, description, rawText, and confidence. Do not invent missing values; use null for fields that are not visible. Preserve the original language and currency. confidence must be a number from 0 to 1 reflecting extraction certainty.";


export class GroqVisionProvider {

  readonly name =
    "groq-vision";


  private readonly endpoint:string;

  private readonly fetchImpl:FetchLike;

  private readonly maxBytes:number;

  private readonly defaultPrompt:string;


  constructor(
    private readonly options:
      GroqVisionProviderOptions,
  ){

    this.endpoint =
      options.endpoint
      ??
      "https://api.groq.com/openai/v1/chat/completions";

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


  async extractReceipt(
    input:ReceiptVisionInput,
  ):Promise<AIProviderResult<ReceiptVisionCandidate>>{

    if(!this.isAvailable()){

      return {
        status:"unavailable",
        provider:this.name,
        reason:"GROQ_VISION_CONFIGURATION_MISSING",
      };

    }

    if(input.image.byteLength === 0){

      return {
        status:"invalid",
        provider:this.name,
        reason:"RECEIPT_IMAGE_EMPTY",
      };

    }

    if(input.image.byteLength > this.maxBytes){

      return {
        status:"invalid",
        provider:this.name,
        reason:"RECEIPT_IMAGE_TOO_LARGE",
      };

    }


    const base64 =
      Buffer.from(
        input.image,
      ).toString(
        "base64",
      );

    const imageUrl =
      `data:${input.mimeType || "image/jpeg"};base64,${base64}`;

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
              "Content-Type":"application/json",
            },
            body:JSON.stringify({
              model:this.options.model,
              temperature:0,
              response_format:{
                type:"json_object",
              },
              messages:[
                {
                  role:"user",
                  content:[
                    {
                      type:"text",
                      text:
                        input.prompt
                        ??
                        this.defaultPrompt,
                    },
                    {
                      type:"image_url",
                      image_url:{
                        url:imageUrl,
                      },
                    },
                  ],
                },
              ],
            }),
          },
        );

    }catch{

      return {
        status:"failed",
        provider:this.name,
        reason:"GROQ_VISION_REQUEST_FAILED",
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
          `GROQ_VISION_HTTP_${response.status}`,
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
        reason:"GROQ_VISION_RESPONSE_NOT_JSON",
      };

    }


    const content =
      this.extractContent(
        payload,
      );

    if(!content){

      return {
        status:"invalid",
        provider:this.name,
        reason:"GROQ_VISION_CONTENT_MISSING",
      };

    }


    let candidate:unknown;

    try{

      candidate =
        JSON.parse(
          content,
        );

    }catch{

      return {
        status:"invalid",
        provider:this.name,
        reason:"GROQ_VISION_CONTENT_INVALID_JSON",
      };

    }


    const root =
      this.asRecord(
        candidate,
      );

    const rawText =
      this.asString(
        root.rawText,
      );

    if(!rawText){

      return {
        status:"invalid",
        provider:this.name,
        reason:"GROQ_VISION_RAW_TEXT_MISSING",
      };

    }


    const amount =
      this.normalizeAmount(
        root.amount,
      );

    const currency =
      this.asString(
        root.currency,
      );

    const merchantName =
      this.asString(
        root.merchantName,
      );

    const transactionDate =
      this.asString(
        root.transactionDate,
      );

    const description =
      this.asString(
        root.description,
      );

    const confidence =
      this.normalizeConfidence(
        root.confidence,
      );

    return {
      status:"success",
      provider:this.name,
      value:{
        ...(amount
          ? {amount}
          : {}),
        ...(currency
          ? {currency}
          : {}),
        ...(merchantName
          ? {merchantName}
          : {}),
        ...(transactionDate
          ? {transactionDate}
          : {}),
        ...(description
          ? {description}
          : {}),
        rawText,
        ...(confidence !== undefined
          ? {confidence}
          : {}),
        latencyMs,
        model:
          this.options.model,
      },
    };

  }


  private extractContent(
    payload:unknown,
  ):string{

    const root =
      this.asRecord(
        payload,
      );

    const choices =
      Array.isArray(root.choices)
        ?
        root.choices
        :
        [];

    const first =
      this.asRecord(
        choices[0],
      );

    const message =
      this.asRecord(
        first.message,
      );

    return this.asString(
      message.content,
    );

  }


  private normalizeAmount(
    value:unknown,
  ):string | undefined{

    const raw =
      this.asString(
        value,
      )
      .replace(",", ".");

    if(
      !/^\d+(?:\.\d{1,2})?$/.test(
        raw,
      )
    ){

      return undefined;

    }

    const amount =
      Number(raw);

    return Number.isFinite(amount)
      &&
      amount > 0
        ?
        amount.toFixed(2)
        :
        undefined;

  }


  private normalizeConfidence(
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
      Math.max(
        0,
        Math.min(
          1,
          number,
        ),
      )
      :
      undefined;

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

}
