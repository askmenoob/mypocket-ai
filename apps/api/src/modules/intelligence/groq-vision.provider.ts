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


export type ReceiptDocumentKind =
  | "RECEIPT"
  | "NOT_RECEIPT";


export interface ReceiptVisionCandidate {

  documentKind?:ReceiptDocumentKind;

  receiptEvidence?:string[];

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


const RECEIPT_GATE_PROMPT =
  "Classify the image before extraction. Return documentKind exactly RECEIPT or NOT_RECEIPT and receiptEvidence as an array of short directly visible reasons. A RECEIPT must visibly be a physical or digital proof of a completed transaction and must contain a payable-total cue such as TOTAL, GRAND TOTAL, AMOUNT, AMOUNT PAID, BILL, SUB-TOTAL, JUMLAH, JUMLAH BAYAR or TL, together with transaction context such as a merchant, purchased item, receipt or invoice number, date/time or payment method. Family photos, portraits, posters, advertisements, social-media images, chat screenshots, memes, product-only photos, menus, price tags, unrelated documents and video frames are NOT_RECEIPT even if they contain a logo, currency symbol, number or the word amount. Never invent receipt text. For NOT_RECEIPT, leave all financial fields null. For RECEIPT, include documentKind and receiptEvidence with the normal extraction fields.";


const DEFAULT_PROMPT =
  "Read this receipt or document. Return JSON only with amount, currency, merchantName, merchantBrand, transactionDate, description, purchaseDetails, visualCues, receiptType, rawText, and confidence. merchantName is the exact printed legal merchant when visible. For AEON, preserve AEON CO. (M) BHD when that full company name is printed; use AEON only when the legal name is absent or unreadable. merchantBrand is the consumer brand or company logo visible on the receipt, even when it differs from merchantName; for example a Shell logo on a MANKON PHOENIX ENTERPRISE receipt means merchantBrand is Shell. If the legal merchant name is unreadable but the brand is visible, use the brand as merchantName; never use a company registration number, site ID, terminal ID, or reference number as merchantName. visualCues must be an array of short visible cues such as Shell logo, petrol-pump icon, Pump 8, or fuel nozzle. purchaseDetails must contain purchased item or service names only, comma-separated when multiple; exclude prices, totals, quantities, units, pump numbers, card numbers, authorization codes, reference numbers, and other payment credentials. receiptType must be exactly one of FUEL, GROCERIES, DINING, TRANSPORT, UTILITIES, RETAIL, HEALTHCARE, ACCOMMODATION, SERVICES, or OTHER. Use FUEL whenever a fuel-company logo or brand such as Shell, Petronas, Petron, Caltex, BHPetrol, or Esso is visible, even if the legal merchant has another name, or when the receipt shows a petrol-pump icon, pump number, petrol, diesel, fuel, RON grade, a per-litre price such as RM4.570/L, or fuel-volume details combined with service-station evidence. An ordinary grocery item such as milk or water sold in a one-litre package is not fuel. For a mixed department store such as AEON, inspect the purchased item names: use GROCERIES only when the items clearly identify food, drinks, toiletries, cleaning products, or household consumables; use RETAIL when the item names are unclear or coded, including CHARACTER BB or KIKILALA BB-7844. A store header saying SUPERMARKET alone is not grocery-item evidence. Use GROCERIES for recognizable household groceries; DINING for restaurants, cafes, and prepared food. Classify using logos, visual cues, the merchant, purchased items, pump or terminal details, and receipt wording rather than the merchant name alone. description must be a concise human-readable summary of what was bought. The amount must be the final amount actually paid by the customer, usually labelled TOTAL AFTER ADJ, TOTAL, GRAND TOTAL, TOTAL PAID, NET TOTAL, AMOUNT PAID, SUB-TOTAL, JUMLAH BAYAR, JUMLAH DIBAYAR, JUMLAH, or TL when TL appears as the receipt total label at the start of an amount line. Prefer Total After Adj and the final payable total over earlier totals, item totals, tax, service charge, discount, rounding, cash tendered, or change. A final total is often bold, boxed, highlighted, visually emphasized, or placed near the payment method; use that layout as supporting evidence but never choose an item price only because it is bold. Treat Sub-total as the final payment only when no later payable total exists or when Sub-total, Total Sales, Total After Adj, and the payment line such as Visa, Mastercard, Card, or Cash show the same equal amount and change or adjustments are zero. If multiple totals differ, choose the final amount due or paid after adjustments. transactionDate must be the date printed on the receipt for that purchase or receipt issue. If multiple dates are visible, prefer the printed receipt transaction or issue date near the receipt or invoice number and time; do not use membership, promotion, expiry, settlement, delivery, or warranty dates. Use YYYY-MM-DD; otherwise use null. Do not invent missing values; use null for scalar fields and an empty array for visualCues when evidence is not visible. Preserve the original language and currency. confidence must be a number from 0 to 1 reflecting extraction certainty.";


const RECEIPT_REFERENCE_PROMPT =
  "Also return referenceNumber, receiptNumber, and invoiceNumber as separate scalar fields. Read labels such as Reference No, Ref No, Reference Number, Receipt No, Receipt Number, No. Resit, Invoice No, or Invoice Number. Preserve leading zeroes. Extract every labeled value that is visible. MyPocket will prefer referenceNumber, then receiptNumber, then invoiceNumber as the fallback reference. Do not use terminal ID, site ID, batch number, approval code, authorization code, card number, or company registration number for these fields. Use null when a value is not visible.";


const RECEIPT_JSON_FALLBACK_PROMPT =
  "Short fallback receipt extraction. Return exactly one valid JSON object without markdown. Use only these keys: amount, currency, merchantName, merchantBrand, transactionDate, description, purchaseDetails, visualCues, receiptType, referenceNumber, receiptNumber, invoiceNumber, rawText, confidence. Use null for missing scalar values and [] for visualCues. amount is the final amount paid; prefer Total After Adj, then a labeled or visually emphasized final total, and use Sub-total only as the last fallback. Never use cash tendered or change. For AEON, use the full printed legal name AEON CO. (M) BHD when visible. Classify AEON from purchased item names: clear food, drinks, toiletries, cleaning products, or household consumables are GROCERIES; unclear or coded items such as CHARACTER BB or KIKILALA BB-7844 are RETAIL. purchaseDetails contains item names only without prices, quantities, or units. referenceNumber, receiptNumber, and invoiceNumber are separate labeled values; preserve leading zeroes. receiptType must be FUEL, GROCERIES, DINING, TRANSPORT, UTILITIES, RETAIL, HEALTHCARE, ACCOMMODATION, SERVICES, or OTHER. transactionDate is the printed receipt transaction or issue date; when multiple dates exist, ignore expiry, promotion, membership, delivery, settlement, and warranty dates. Use YYYY-MM-DD. rawText must contain the readable receipt text.";


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

    const createRequestInit =
      (
        prompt:string,
        strictJson = true,
      ):RequestInit => ({
        method:"POST",
        headers:{
          Authorization:
            `Bearer ${this.options.apiKey}`,
          "Content-Type":"application/json",
        },
        body:JSON.stringify({
          model:this.options.model,
          temperature:0,
          ...(strictJson
            ? {
                response_format:{
                  type:"json_object",
                },
              }
            : {}),
          messages:[
            {
              role:"user",
              content:[
                {
                  type:"text",
                  text:prompt,
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
      });

    const requestInit =
      createRequestInit(
        [
          RECEIPT_GATE_PROMPT,
          input.prompt
          ??
          this.defaultPrompt,
          RECEIPT_REFERENCE_PROMPT,
        ].join(" "),
      );

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
            createRequestInit(
              [
                RECEIPT_GATE_PROMPT,
                RECEIPT_JSON_FALLBACK_PROMPT,
              ].join(" "),
              false,
            ),
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


    const candidate =
      this.parseJsonContent(
        content,
      );

    if(candidate === undefined){

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

    const rawDocumentKind =
      this.asString(
        root.documentKind,
      )
        .trim()
        .toUpperCase();

    const documentKind =
      rawDocumentKind === "RECEIPT"
        ? "RECEIPT" as const
        : rawDocumentKind === "NOT_RECEIPT"
          ? "NOT_RECEIPT" as const
          : undefined;

    const receiptEvidence =
      this.asStringArray(
        root.receiptEvidence,
      );

    const rawText =
      this.asString(
        root.rawText,
      );

    if(documentKind === "NOT_RECEIPT"){

      const confidence =
        this.normalizeConfidence(
          root.confidence,
        );

      return {
        status:"success",
        provider:this.name,
        value:{
          documentKind,
          ...(receiptEvidence.length > 0
            ? {receiptEvidence}
            : {}),
          rawText,
          ...(confidence !== undefined
            ? {confidence}
            : {}),
          latencyMs,
          model:this.options.model,
        },
      };

    }

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
        rawText,
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
      this.normalizePurchaseDetails(
        root.purchaseDetails,
        description,
        rawText,
      );

    const visualCues =
      this.asStringArray(
        root.visualCues,
      );

    const labeledReferenceNumber =
      this.extractLabeledReceiptReference(
        rawText,
        "REFERENCE",
      );

    const labeledReceiptNumber =
      this.extractLabeledReceiptReference(
        rawText,
        "RECEIPT",
      );

    const labeledInvoiceNumber =
      this.extractLabeledReceiptReference(
        rawText,
        "INVOICE",
      );

    const modelReferenceNumber =
      this.normalizeReceiptReference(
        root.referenceNumber,
      );

    const modelReceiptNumber =
      this.normalizeReceiptReference(
        root.receiptNumber,
      );

    const modelInvoiceNumber =
      this.normalizeReceiptReference(
        root.invoiceNumber,
      );

    const receiptReference =
      labeledReferenceNumber
      ??
      labeledReceiptNumber
      ??
      labeledInvoiceNumber
      ??
      modelReferenceNumber
      ??
      modelReceiptNumber
      ??
      modelInvoiceNumber;

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
        ...(documentKind
          ? {documentKind}
          : {}),
        ...(receiptEvidence.length > 0
          ? {receiptEvidence}
          : {}),
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

    const aeonReceipt =
      /\baeon\b/i.test(
        [
          merchantName,
          merchantBrand,
          rawText,
        ].join("\n"),
      );

    if(aeonReceipt){

      const purchasedItems =
        [
          description,
          purchaseDetails,
          rawText,
        ]
          .join("\n")
          .toLowerCase();

      const groceryItems =
        /\b(?:milk|susu|rice|beras|eggs?|telur|bread|roti|flour|tepung|sugar|gula|salt|garam|cooking\s*oil|minyak\s*masak|chicken|ayam|beef|daging|fish|ikan|vegetables?|sayur|fruits?|buah|mineral\s*water|air\s*mineral|drinks?|minuman|juice|jus|coffee|kopi|tea|teh|biscuits?|cookies?|cereal|noodles?|mee|pasta|diapers?|lampin|detergent|sabun|shampoo|toothpaste|ubat\s*gigi|tissues?|toilet\s*paper|cleaner|softener|dishwash(?:ing)?)\b/i
          .test(
            purchasedItems,
          );

      return groceryItems
        ? "GROCERIES"
        : "RETAIL";

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


  private parseJsonContent(
    content:string,
  ):unknown | undefined{

    const candidates = [
      content.trim(),
    ];

    const fenced =
      /```(?:json)?\s*([\s\S]*?)```/i
        .exec(
          content,
        )?.[1]
        ?.trim();

    if(fenced){

      candidates.push(
        fenced,
      );

    }

    const firstBrace =
      content.indexOf(
        "{",
      );
    const lastBrace =
      content.lastIndexOf(
        "}",
      );

    if(
      firstBrace >= 0
      &&
      lastBrace > firstBrace
    ){

      candidates.push(
        content.slice(
          firstBrace,
          lastBrace + 1,
        ),
      );

    }

    for(const candidate of candidates){

      try{

        return JSON.parse(
          candidate,
        );

      }catch{

        continue;

      }

    }

    return undefined;

  }


  private normalizePurchaseDetails(
    value:unknown,
    description:string,
    rawText:string,
  ):string{

    const supplied =
      this.asString(
        value,
      );

    const describedItems =
      /^(?:purchase(?:d)?|bought)(?:\s+of)?\s+(.+)$/i
        .exec(
          description,
        )?.[1]
        ?.trim()
      ??
      "";

    const rawItems =
      /\baeon\b/i.test(
        rawText,
      )
        ? this.extractAeonPurchaseDetails(
            rawText,
          )
        : "";

    const source =
      supplied
      ||
      describedItems
      ||
      rawItems;

    if(!source){

      return "";

    }

    const itemSource =
      supplied
        ? source
        : source.replace(
            /\s+and\s+/gi,
            ", ",
          );

    const items =
      itemSource
        .split(/[,;\r\n]+/)
        .map((item) =>
          item
            .trim()
            .replace(/^\d+\s*x\s+/i, "")
            .replace(/\s*\(?pump\s*\d+\)?/gi, "")
            .replace(/\s+(?:RM|MYR)\s*\d[\d,.]*(?:\s*\/\s*(?:l|ltr|litres?|liters?))?.*$/i, "")
            .replace(/\s+\d+(?:[.,]\d+)?\s*(?:l|ltr|litres?|liters?|ml|kg|g|pcs?|units?)\b(?:\s*@.*)?$/i, "")
            .trim(),
        )
        .filter((item) =>
          item.length > 0
          &&
          !/^pump\s*\d+$/i.test(
            item,
          )
          &&
          !/^(?:(?:RM|MYR)\s*)?\d+(?:[.,]\d+)?$/i.test(
            item,
          )
          &&
          !/^\d+(?:[.,]\d+)?\s*(?:l|ltr|litres?|liters?|ml|kg|g|pcs?|units?)\b/i.test(
            item,
          ),
        )
        .filter((item, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.toLowerCase()
              ===
              item.toLowerCase(),
          ) === index,
        )
        .slice(0, 12);

    return items.join(", ");

  }


  private extractAeonPurchaseDetails(
    rawText:string,
  ):string{

    const lines =
      rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const names:string[] = [];

    const addName =
      (candidate:string) => {

        const name =
          candidate
            .replace(/^\d+\s*x\s+/i, "")
            .trim();

        if(
          !/[a-z]/i.test(
            name,
          )
          ||
          /^(?:sub[-\s]*total|total|tax|visa|mastercard|card|cash|change|e-?voucher|invoice|date|time|item\s*count|shopping\s*hours|valued\s*customer)\b/i.test(
            name,
          )
          ||
          /^\d+\s*x\s+[a-z0-9-]+$/i.test(
            candidate,
          )
        ){

          return;

        }

        if(
          !names.some(
            (existing) =>
              existing.toLowerCase()
              ===
              name.toLowerCase(),
          )
        ){

          names.push(
            name,
          );

        }

      };

    for(let index = 0; index < lines.length; index += 1){

      const line =
        lines[index];

      if(
        /^\d+\s*x\s+[a-z0-9-]{4,}\s+(?:RM\s*)?\d+(?:[.,]\d{2})$/i.test(
          line,
        )
      ){

        const nextLine =
          lines[index + 1]
          ??
          "";

        if(
          nextLine
          &&
          !/(?:RM\s*)?\d+(?:[.,]\d{2})\s*$/i.test(
            nextLine,
          )
        ){

          addName(
            nextLine,
          );

        }

        continue;

      }

      const itemWithPrice =
        /^(.{2,100}?)\s+(?:RM\s*)?\d+(?:[.,]\d{2})$/i
          .exec(
            line,
          )?.[1]
          ?.trim();

      if(itemWithPrice){

        addName(
          itemWithPrice,
        );

      }

    }

    return names
      .slice(0, 12)
      .join(", ");

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
        /(?:total\s*after\s*(?:adj(?:ustment)?|adjusted)|adjusted\s*total)/i,
        4,
      ],
      [
        /^tl\b/i,
        3,
      ],
      [
        /(?:grand\s*total|total\s*paid|amount\s*paid|net\s*total|total\s*due|balance\s*due|jumlah\s*(?:perlu\s*)?(?:bayar|dibayar))/i,
        3,
      ],
      [
        /^jumlah\b(?!\s*(?:item|barang|kuantiti|qty))/i,
        2,
      ],
      [
        /^sub[-\s]*total\b/i,
        0,
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
          /sub[-\s]*$/i.test(
            beforeLabel,
          )
        ){

          continue;

        }

        const afterLabel =
          line.slice(
            match.index + match[0].length,
          );

        if(
          priority === 0
          &&
          /\b(?:total|jumlah\s*(?:bayar|dibayar))\b/i.test(
            afterLabel,
          )
        ){

          continue;

        }

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
    type:
      | "REFERENCE"
      | "RECEIPT"
      | "INVOICE",
  ):string | undefined{

    const label =
      type === "REFERENCE"
        ? /\b(?:reference|ref)\s*(?:no\.?|number|#)?\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]{2,})/i
        : type === "RECEIPT"
          ? /\b(?:receipt\s*(?:no\.?|number|#)|no\.?\s*resit)\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]{2,})/i
          : /\binvoice\s*(?:no\.?|number|#)\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]{2,})/i;

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
    rawText:string,
  ){

    if(
      /\baeon\s+co\.?\s*\(\s*m\s*\)\s*bhd\b/i.test(
        rawText,
      )
    ){

      return "AEON CO. (M) BHD";

    }

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
