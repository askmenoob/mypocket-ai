import type {
  AITextProvider,
} from "./ai-provider.js";


import type {
  AIProviderResult,
  AITransactionParseInput,
} from "./ai-provider.types.js";


export interface GroqTransactionCandidate {

  amount:string;

  currency:string;

  type:
    | "EXPENSE"
    | "INCOME";

  categoryName:string;

  merchantName?:string;

  paymentMethodName?:string;

  description:string;

  transactionDate:string;

  rawText:string;

}


type FetchLike =
  (
    input:string,
    init?:RequestInit,
  ) => Promise<Response>;


interface GroqTextProviderOptions {

  apiKey?:string;

  model:string;

  endpoint?:string;

  fetchImpl?:FetchLike;

}


export class GroqTextProvider
implements AITextProvider<GroqTransactionCandidate> {

  readonly name =
    "groq";


  readonly capabilities =
    [
      "text",
    ] as const;


  private readonly endpoint:string;

  private readonly fetchImpl:FetchLike;


  constructor(
    private readonly options:
      GroqTextProviderOptions,
  ){

    this.endpoint =
      options.endpoint
      ??
      "https://api.groq.com/openai/v1/chat/completions";


    this.fetchImpl =
      options.fetchImpl
      ??
      fetch;

  }


  isAvailable(){

    return Boolean(
      this.options.apiKey
      &&
      this.options.model,
    );

  }


  async parseTransaction(
    input:AITransactionParseInput,
  ):Promise<
    AIProviderResult<GroqTransactionCandidate>
  >{

    if(!this.isAvailable()){

      return {
        status:
          "unavailable",

        provider:
          this.name,

        reason:
          "GROQ_CONFIGURATION_MISSING",
      };

    }


    let response:Response;


    try{

      response =
        await this.fetchImpl(
          this.endpoint,
          {
            method:
              "POST",

            headers:{
              Authorization:
                `Bearer ${this.options.apiKey}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                model:
                  this.options.model,

                temperature:
                  0,

                response_format:{
                  type:
                    "json_object",
                },

                messages:[
                  {
                    role:
                      "system",

                    content:
                      this.systemPrompt(),
                  },
                  {
                    role:
                      "user",

                    content:
                      JSON.stringify({
                        text:
                          input.text,

                        transactionDate:
                          input.transactionDate,

                        currency:
                          input.currency
                          ??
                          "MYR",
                      }),
                  },
                ],
              }),
          },
        );

    }catch{

      return {
        status:
          "failed",

        provider:
          this.name,

        reason:
          "GROQ_REQUEST_FAILED",
      };

    }


    if(!response.ok){

      return {
        status:
          "failed",

        provider:
          this.name,

        reason:
          `GROQ_HTTP_${response.status}`,
      };

    }


    let payload:unknown;


    try{

      payload =
        await response.json();

    }catch{

      return {
        status:
          "invalid",

        provider:
          this.name,

        reason:
          "GROQ_RESPONSE_NOT_JSON",
      };

    }


    const content =
      this.extractContent(
        payload,
      );


    if(!content){

      return {
        status:
          "invalid",

        provider:
          this.name,

        reason:
          "GROQ_CONTENT_MISSING",
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
        status:
          "invalid",

        provider:
          this.name,

        reason:
          "GROQ_CONTENT_INVALID_JSON",
      };

    }


    const normalized =
      this.normalizeCandidate(
        candidate,
        input,
      );


    if(!normalized){

      return {
        status:
          "invalid",

        provider:
          this.name,

        reason:
          "GROQ_TRANSACTION_SHAPE_INVALID",
      };

    }


    return {
      status:
        "success",

      provider:
        this.name,

      value:
        normalized,
    };

  }


  private systemPrompt(){

    return [
      "Extract one financial transaction.",
      "Return JSON only.",
      "Required keys:",
      "amount, currency, type, categoryName,",
      "description, transactionDate, rawText.",
      "Optional keys:",
      "merchantName, paymentMethodName.",
      "type must be EXPENSE or INCOME.",
      "amount must be a positive numeric string.",
      "Do not add commentary.",
    ].join(
      " ",
    );

  }


  private extractContent(
    payload:unknown,
  ){

    const root =
      this.asRecord(
        payload,
      );


    const choices =
      Array.isArray(
        root.choices,
      )
        ? root.choices
        : [];


    const firstChoice =
      this.asRecord(
        choices[0],
      );


    const message =
      this.asRecord(
        firstChoice.message,
      );


    return typeof message.content === "string"
      ? message.content
      : "";

  }


  private normalizeCandidate(
    value:unknown,

    input:AITransactionParseInput,
  ):GroqTransactionCandidate | null{

    const candidate =
      this.asRecord(
        value,
      );


    const amount =
      this.stringValue(
        candidate.amount,
      );


    const amountValue =
      Number(
        amount,
      );


    const type =
      candidate.type === "INCOME"
      ||
      candidate.type === "EXPENSE"
        ? candidate.type
        : null;


    const categoryName =
      this.stringValue(
        candidate.categoryName,
      );


    if(
      !amount
      ||
      !Number.isFinite(
        amountValue,
      )
      ||
      amountValue <= 0
      ||
      !type
      ||
      !categoryName
    ){

      return null;

    }


    const rawText =
      this.stringValue(
        candidate.rawText,
      )
      ||
      input.text;


    const description =
      this.stringValue(
        candidate.description,
      )
      ||
      rawText;


    return {
      amount,

      currency:
        (
          this.stringValue(
            candidate.currency,
          )
          ||
          input.currency
          ||
          "MYR"
        )
          .toUpperCase(),

      type,

      categoryName,

      merchantName:
        this.optionalString(
          candidate.merchantName,
        ),

      paymentMethodName:
        this.optionalString(
          candidate.paymentMethodName,
        ),

      description,

      transactionDate:
        this.stringValue(
          candidate.transactionDate,
        )
        ||
        input.transactionDate
        ||
        new Date()
          .toISOString(),

      rawText,
    };

  }


  private asRecord(
    value:unknown,
  ):Record<string, unknown>{

    return typeof value === "object"
      &&
      value !== null
        ? value as Record<string, unknown>
        : {};

  }


  private stringValue(
    value:unknown,
  ){

    return typeof value === "string"
      ? value.trim()
      : "";

  }


  private optionalString(
    value:unknown,
  ){

    const normalized =
      this.stringValue(
        value,
      );


    return normalized
      ||
      undefined;

  }

}
