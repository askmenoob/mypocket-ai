import type {
  AIProviderResult,
} from "./ai-provider.types.js";


export interface ReceiptVisionInput {

  image:Uint8Array;

  mimeType:string;

  fileName:string;

  prompt?:string;

}


export type ReceiptType =
  | "FUEL"
  | "GROCERIES"
  | "DINING"
  | "TRANSPORT"
  | "UTILITIES"
  | "RETAIL"
  | "HEALTHCARE"
  | "ACCOMMODATION"
  | "SERVICES"
  | "OTHER";


export type ReceiptClassificationSource =
  | "GROQ"
  | "EVIDENCE"
  | "MEMORY";


export interface ReceiptVisionCandidate {

  amount?:string;

  currency?:string;

  merchantName?:string;

  transactionDate?:string;

  description?:string;

  receiptType?:ReceiptType;

  categoryName?:string;

  classificationSource?:ReceiptClassificationSource;

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
  "Read this receipt or document. Return JSON only with amount, currency, merchantName, transactionDate, description, receiptType, rawText, and confidence. receiptType must be exactly one of FUEL, GROCERIES, DINING, TRANSPORT, UTILITIES, RETAIL, HEALTHCARE, ACCOMMODATION, SERVICES, or OTHER. Use FUEL for petrol, diesel, fuel pumps, RON grades, litres, or service-station fuel purchases; GROCERIES for supermarkets and household groceries; DINING for restaurants, cafes, and prepared food. Classify using the merchant, purchased items, pump or terminal details, and receipt wording rather than the merchant name alone. The amount must be the final amount actually paid by the customer, usually labelled TOTAL, GRAND TOTAL, TOTAL PAID, NET TOTAL, AMOUNT PAID, JUMLAH BAYAR, JUMLAH DIBAYAR, or TL when TL appears as the receipt total label at the start of an amount line. Prefer that final payable total over subtotal, item totals, tax, service charge, discount, rounding, cash tendered, or change. If multiple totals exist, choose the final amount due/paid. Use YYYY-MM-DD for transactionDate when the printed receipt date is visible; otherwise use null. Do not invent missing values; use null for fields that are not visible. Preserve the original language and currency. confidence must be a number from 0 to 1 reflecting extraction certainty.";


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


    const modelAmount =
      this.normalizeAmount(
        root.amount,
      );

    // Prefer an explicit final-total line from OCR text. This protects the
    // transaction amount when the model chooses a subtotal or leaves amount
    // blank on a noisy receipt.
    const finalTotal =
      this.extractFinalPaidAmount(
        rawText,
      );

    const amount =
      finalTotal.amount
      ??
      modelAmount;

    const currency =
      this.asString(
        root.currency,
      )
      ||
      finalTotal.currency;

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

    const classification =
      this.classifyReceipt(
        root.receiptType,
        merchantName,
        rawText,
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
        ...classification,
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


  private classifyReceipt(
    modelValue:unknown,
    merchantName:string,
    rawText:string,
  ):Pick<
    ReceiptVisionCandidate,
    "receiptType" | "classificationSource"
  >{

    const evidenceType =
      this.inferReceiptTypeFromEvidence(
        merchantName,
        rawText,
      );

    if(evidenceType){

      return {
        receiptType:evidenceType,
        classificationSource:"EVIDENCE",
      };

    }

    const receiptType =
      this.normalizeReceiptType(
        modelValue,
      );

    return receiptType
      ? {
          receiptType,
          classificationSource:"GROQ",
        }
      : {};

  }


  private normalizeReceiptType(
    value:unknown,
  ):ReceiptType | undefined{

    const normalized =
      this.asString(
        value,
      )
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    const aliases:
      Record<string, ReceiptType> = {
        FUEL:"FUEL",
        PETROL:"FUEL",
        GAS_STATION:"FUEL",
        GROCERIES:"GROCERIES",
        GROCERY:"GROCERIES",
        SUPERMARKET:"GROCERIES",
        DINING:"DINING",
        RESTAURANT:"DINING",
        FOOD:"DINING",
        TRANSPORT:"TRANSPORT",
        TRANSPORTATION:"TRANSPORT",
        UTILITIES:"UTILITIES",
        UTILITY:"UTILITIES",
        BILLS:"UTILITIES",
        RETAIL:"RETAIL",
        SHOPPING:"RETAIL",
        HEALTHCARE:"HEALTHCARE",
        HEALTH:"HEALTHCARE",
        PHARMACY:"HEALTHCARE",
        ACCOMMODATION:"ACCOMMODATION",
        HOTEL:"ACCOMMODATION",
        SERVICES:"SERVICES",
        SERVICE:"SERVICES",
        OTHER:"OTHER",
        OTHERS:"OTHER",
      };

    return aliases[normalized];

  }


  private inferReceiptTypeFromEvidence(
    merchantName:string,
    rawText:string,
  ):ReceiptType | undefined{

    const merchant =
      merchantName.toLowerCase();

    const text =
      `${merchantName}\n${rawText}`
        .toLowerCase();

    const fuelMerchant =
      /\b(?:shell|petronas|petron|caltex|bhpetrol|esso)\b/i
        .test(
          merchant,
        );

    const fuelEvidence =
      /\b(?:pump|fuel|petrol|diesel|ron\s*9[57]|litres?|liters?|[0-9]+(?:\.[0-9]+)?\s*l\b|rm\s*\/\s*l|minyak)\b/i
        .test(
          text,
        );

    if(fuelEvidence && fuelMerchant){

      return "FUEL";

    }

    if(
      /\b(?:99\s*speed\s*mart|lotus'?s?|tesco|giant|aeon\s*big|econsave|jaya\s*grocer|village\s*grocer)\b/i
        .test(
          merchant,
        )
    ){

      return "GROCERIES";

    }

    return undefined;

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

    let raw =
      this.asString(
        value,
      )
      .replace(/[^0-9,.-]/g, "");

    if(raw.includes(",") && raw.includes(".")){

      raw =
        raw.replace(/,/g, "");

    }else if(raw.includes(",")){

      const parts =
        raw.split(",");

      raw =
        parts.length === 2
        &&
        parts[1].length <= 2
          ?
          `${parts[0]}.${parts[1]}`
          :
          raw.replace(/,/g, "");

    }

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


  private extractFinalPaidAmount(
    rawText:string,
  ):{
    amount?:string;
    currency?:string;
  }{

    const lines =
      rawText
        .replace(/[\u00a0\u202f]/g, " ")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const priorityLabels:[RegExp, number][] = [
      [
        /^tl\b/i,
        3,
      ],
      [
        /(?:grand\s*total|total\s*paid|amount\s*paid|net\s*total|total\s*due|balance\s*due|jumlah\s*(?:perlu\s*)?(?:bayar|dibayar))/i,
        3,
      ],
      [
        /\btotal\b/i,
        1,
      ],
    ];

    let best:
      {
        amount:string;
        currency?:string;
        priority:number;
      }
      | undefined;

    for(const line of lines){

      for(const [label, priority] of priorityLabels){

        const match =
          label.exec(line);

        if(!match){

          continue;

        }

        // Do not treat the second word in "SUB TOTAL" as the final total.
        const beforeLabel =
          line.slice(0, match.index);

        if(
          /sub\s*$/i.test(
            beforeLabel,
          )
        ){

          continue;

        }

        const afterLabel =
          line.slice(
            match.index + match[0].length,
          );

        const afterValues =
          this.extractMonetaryValues(
            afterLabel,
          );

        const beforeValues =
          afterValues.length === 0
            ?
            this.extractMonetaryValues(
              line.slice(0, match.index),
            )
            :
            [];

        const value =
          afterValues[0]
          ??
          beforeValues[beforeValues.length - 1];

        if(!value){

          continue;

        }

        if(!best || priority >= best.priority){

          best = {
            amount:value.amount,
            ...(value.currency
              ? {currency:value.currency}
              : {}),
            priority,
          };

        }

        break;

      }

    }

    return best
      ? {
          amount:best.amount,
          ...(best.currency
            ? {currency:best.currency}
            : {}),
        }
      : {};

  }


  private extractMonetaryValues(
    text:string,
  ):Array<{
    amount:string;
    currency?:string;
  }>{

    const pattern =
      /(?:(RM|MYR|USD|EUR|GBP)\s*)?(-?(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[,.]\d{1,2})?))/gi;

    const values:Array<{
      amount:string;
      currency?:string;
    }> = [];

    for(const match of text.matchAll(pattern)){

      const amount =
        this.normalizeAmount(
          match[2],
        );

      if(!amount || Number(amount) <= 0){

        continue;

      }

      values.push({
        amount,
        ...(match[1]
          ? {currency:match[1].toUpperCase()}
          : {}),
      });

    }

    return values;

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
