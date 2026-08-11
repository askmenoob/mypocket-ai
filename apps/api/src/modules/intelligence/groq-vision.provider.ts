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

  merchantBrand?:string;

  transactionDate?:string;

  description?:string;

  purchaseDetails?:string;

  visualCues?:string[];

  receiptReference?:string;

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
  "Read this receipt or document. Return JSON only with amount, currency, merchantName, merchantBrand, transactionDate, description, purchaseDetails, visualCues, receiptType, rawText, and confidence. merchantName is the printed legal merchant. merchantBrand is the consumer brand or company logo visible on the receipt, even when it differs from merchantName; for example a Shell logo on a MANKON PHOENIX ENTERPRISE receipt means merchantBrand is Shell. If the legal merchant name is unreadable but the brand is visible, use the brand as merchantName; never use a company registration number, site ID, terminal ID, or reference number as merchantName. visualCues must be an array of short visible cues such as Shell logo, petrol-pump icon, Pump 8, or fuel nozzle. purchaseDetails must concisely retain the purchased product or service and useful quantity, unit, pump, and unit-rate details, for example FS Diesel, Pump 8, 85.340 L @ RM4.570/L; exclude card numbers, authorization codes, reference numbers, and other payment credentials. receiptType must be exactly one of FUEL, GROCERIES, DINING, TRANSPORT, UTILITIES, RETAIL, HEALTHCARE, ACCOMMODATION, SERVICES, or OTHER. Use FUEL whenever a fuel-company logo or brand such as Shell, Petronas, Petron, Caltex, BHPetrol, or Esso is visible, even if the legal merchant has another name, or when the receipt shows a petrol-pump icon, pump number, petrol, diesel, fuel, RON grade, a per-litre price such as RM4.570/L, or fuel-volume details combined with service-station evidence. An ordinary grocery item such as milk or water sold in a one-litre package is not fuel. Use GROCERIES for supermarkets and household groceries; DINING for restaurants, cafes, and prepared food. Classify using logos, visual cues, the merchant, purchased items, pump or terminal details, and receipt wording rather than the merchant name alone. description must be a concise human-readable summary of what was bought. The amount must be the final amount actually paid by the customer, usually labelled TOTAL, GRAND TOTAL, TOTAL PAID, NET TOTAL, AMOUNT PAID, JUMLAH BAYAR, JUMLAH DIBAYAR, or TL when TL appears as the receipt total label at the start of an amount line. Prefer that final payable total over subtotal, item totals, tax, service charge, discount, rounding, cash tendered, or change. If multiple totals exist, choose the final amount due/paid. Use YYYY-MM-DD for transactionDate when the printed receipt date is visible; otherwise use null. Do not invent missing values; use null for scalar fields and an empty array for visualCues when evidence is not visible. Preserve the original language and currency. confidence must be a number from 0 to 1 reflecting extraction certainty.";


const RECEIPT_REFERENCE_PROMPT =
  "Also return referenceNumber and receiptNumber as separate scalar fields. Read labels such as Reference No, Ref No, Reference Number, Receipt No, Receipt Number, or No. Resit. Preserve leading zeroes. If both are visible, extract both; MyPocket will prefer referenceNumber. Do not use invoice number, terminal ID, site ID, batch number, approval code, authorization code, card number, or company registration number for these fields. Use null when a value is not visible.";


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

    const requestInit:RequestInit =
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
                    [
                      input.prompt
                      ??
                      this.defaultPrompt,
                      RECEIPT_REFERENCE_PROMPT,
                    ].join(" "),
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
      };

    try{

      response =
        await this.fetchImpl(
          this.endpoint,
          requestInit,
        );

      if(
        await this.isJsonValidationFailure(
          response,
        )
      ){

        response =
          await this.fetchImpl(
            this.endpoint,
            requestInit,
          );

      }

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

    const extractedMerchantName =
      this.asString(
        root.merchantName,
      );

    const merchantBrand =
      this.asString(
        root.merchantBrand,
      );

    const merchantName =
      this.resolveMerchantName(
        extractedMerchantName,
        merchantBrand,
      );

    const transactionDate =
      this.asString(
        root.transactionDate,
      );

    const description =
      this.asString(
        root.description,
      );

    const purchaseDetails =
      this.asString(
        root.purchaseDetails,
      );

    const visualCues =
      this.asStringArray(
        root.visualCues,
      );

    const referenceNumber =
      this.normalizeReceiptReference(
        root.referenceNumber,
      )
      ??
      this.extractLabeledReceiptReference(
        rawText,
        "REFERENCE",
      );

    const receiptNumber =
      this.normalizeReceiptReference(
        root.receiptNumber,
      )
      ??
      this.extractLabeledReceiptReference(
        rawText,
        "RECEIPT",
      );

    const receiptReference =
      referenceNumber
      ??
      receiptNumber;

    const classification =
      this.classifyReceipt(
        root.receiptType,
        merchantName,
        rawText,
        description,
        merchantBrand,
        purchaseDetails,
        visualCues,
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
        ...(merchantBrand
          ? {merchantBrand}
          : {}),
        ...(transactionDate
          ? {transactionDate}
          : {}),
        ...(description
          ? {description}
          : {}),
        ...(purchaseDetails
          ? {purchaseDetails}
          : {}),
        ...(visualCues.length > 0
          ? {visualCues}
          : {}),
        ...(receiptReference
          ? {receiptReference}
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
    description:string,
    merchantBrand:string,
    purchaseDetails:string,
    visualCues:string[],
  ):Pick<
    ReceiptVisionCandidate,
    "receiptType" | "classificationSource"
  >{

    const evidenceType =
      this.inferReceiptTypeFromEvidence(
        merchantName,
        rawText,
        description,
        merchantBrand,
        purchaseDetails,
        visualCues,
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
    description:string,
    merchantBrand:string,
    purchaseDetails:string,
    visualCues:string[],
  ):ReceiptType | undefined{

    const text =
      [
        merchantName,
        merchantBrand,
        description,
        purchaseDetails,
        ...visualCues,
        rawText,
      ]
        .join("\n")
        .toLowerCase();

    const fuelBrand =
      /\b(?:shell(?:card)?|petronas|petron|caltex|bhp\s*petrol|bhpetrol|esso)\b/i
        .test(
          text,
        );

    const fuelProduct =
      /\b(?:pump\s*\d*|fuel|petrol|diesel|gasoline|ron\s*9[57]|minyak\s*(?:petrol|diesel)?)\b/i
        .test(
          text,
        );

    const fuelRate =
      /(?:rm\s*)?\d+(?:\.\d+)?\s*\/\s*(?:l|ltr|litres?|liters?)\b/i
        .test(
          text,
        );

    if(
      fuelBrand
      ||
      fuelProduct
      ||
      fuelRate
    ){

      return "FUEL";

    }

    if(
      /\b(?:99\s*speed\s*mart|lotus'?s?|tesco|giant|aeon\s*big|econsave|jaya\s*grocer|village\s*grocer)\b/i
        .test(
          text,
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


  private normalizeReceiptReference(
    value:unknown,
  ):string | undefined{

    const normalized =
      this.asString(
        value,
      )
        .replace(/\s+/g, " ")
        .trim();

    if(
      !normalized
      ||
      /^(?:n\/?a|none|null|-)$/i.test(
        normalized,
      )
    ){

      return undefined;

    }

    return normalized.slice(0, 120);

  }


  private extractLabeledReceiptReference(
    rawText:string,
    type:"REFERENCE" | "RECEIPT",
  ):string | undefined{

    const label =
      type === "REFERENCE"
        ? /\b(?:reference|ref)\s*(?:no\.?|number|#)?\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]{2,})/i
        : /\b(?:receipt\s*(?:no\.?|number|#)|no\.?\s*resit)\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]{2,})/i;

    const match =
      label.exec(
        rawText,
      );

    return this.normalizeReceiptReference(
      match?.[1],
    );

  }


  private async isJsonValidationFailure(
    response:Response,
  ){

    if(response.status !== 400){

      return false;

    }

    try{

      const payload =
        this.asRecord(
          await response
            .clone()
            .json(),
        );

      const error =
        this.asRecord(
          payload.error,
        );

      return this.asString(
        error.code,
      ) === "json_validate_failed";

    }catch{

      return false;

    }

  }


  private resolveMerchantName(
    merchantName:string,
    merchantBrand:string,
  ){

    if(!merchantBrand){

      return merchantName;

    }

    const registrationLike =
      !/\s/.test(
        merchantName,
      )
      &&
      (
        /\//.test(
          merchantName,
        )
        ||
        /^[a-z]{1,4}\d{5,}[a-z0-9-]*$/i.test(
          merchantName,
        )
        ||
        /^\d{6,}$/.test(
          merchantName,
        )
      );

    return !merchantName
      ||
      registrationLike
        ? merchantBrand
        : merchantName;

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


  private asStringArray(
    value:unknown,
  ):string[]{

    return Array.isArray(value)
      ? value
          .map(
            (item) => this.asString(item),
          )
          .filter(Boolean)
          .slice(0, 12)
      : [];

  }

}
