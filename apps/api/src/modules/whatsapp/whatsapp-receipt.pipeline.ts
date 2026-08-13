import type {
  AIProviderResult,
} from "../intelligence/ai-provider.types.js";


import type {
  ReceiptVisionCandidate,
  ReceiptVisionInput,
} from "../intelligence/groq-vision.provider.js";


import type {
  EvolutionMediaDescriptor,
} from "./whatsapp-media.js";


import type {
  EvolutionMediaDownloadInput,
} from "./evolution-media.downloader.js";


import {
  GoogleDriveService,
} from "../google/drive/google-drive.service.js";

import {
  PassthroughReceiptImageScanner,
  ReceiptMediaValidationError,
  type ReceiptImageScanner,
  type ReceiptOutputFormat,
} from "./receipt-image.scanner.js";

import type {
  WhatsAppMediaMetricObserver,
} from "./whatsapp-media.telemetry.js";


export interface ReceiptMediaDownloader {

  download(
    input:EvolutionMediaDownloadInput,
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


export interface ReceiptVisionProvider {

  extractReceipt(
    input:ReceiptVisionInput,
  ):Promise<AIProviderResult<ReceiptVisionCandidate>>;

}


export interface ReceiptStorage {

  store(
    input:{
      workspaceId:string;
      receiptsFolderId:string;
      fileName:string;
      mimeType:string;
      bytes:Uint8Array;
    },
  ):Promise<{
    id:string;
    url:string;
    name:string;
    mimeType:string;
  }>;

}


export interface PendingReceiptUpload {

  bytes:Uint8Array;

  mimeType:string;

  fileName:string;

}


export class GoogleDriveReceiptStorage
implements ReceiptStorage {

  constructor(
    private readonly drive:
      GoogleDriveService,
  ){}


  async store(
    input:{
      workspaceId:string;
      receiptsFolderId:string;
      fileName:string;
      mimeType:string;
      bytes:Uint8Array;
    },
  ){

    return this.drive.uploadReceiptFile(
      input.workspaceId,
      input,
    );

  }

}


export type ReceiptPipelineResult =
  | {
      status:"ignored";
      source:"RECEIPT";
      reason:
        | "NON_RECEIPT_MEDIA_IGNORED"
        | "NON_RECEIPT_IMAGE_IGNORED";
    }
  | {
      status:"duplicate";
      source:"RECEIPT";
      reason:"RECEIPT_DUPLICATE_IGNORED";
    }
  | {
      status:"unsupported";
      source:"RECEIPT";
      reason:"RECEIPT_MEDIA_KIND_UNSUPPORTED";
    }
  | {
      status:"failed";
      source:"RECEIPT";
      reason:string;
      receiptUrl?:string;
    }
  | {
      status:"stored_pending_ocr";
      source:"RECEIPT";
      receiptUrl:string;
      fileName:string;
    }
  | {
      status:"confirmation_required" | "draft_ready";
      source:"RECEIPT";
      fileName:string;
      extraction:ReceiptVisionCandidate;
      pendingUpload:PendingReceiptUpload;
      reason?:"RECEIPT_LOW_CONFIDENCE_CONFIRMATION";
    };


const DEFAULT_CONFIDENCE_THRESHOLD =
  0.8;


export class WhatsAppReceiptPipeline {

  private readonly processed =
    new Map<string, number>();


  constructor(
    private readonly downloader:ReceiptMediaDownloader,
    private readonly visionProvider:ReceiptVisionProvider,
    private readonly storage:ReceiptStorage,
    private readonly confidenceThreshold =
      DEFAULT_CONFIDENCE_THRESHOLD,
    private readonly idempotencyTtlMs =
      24 * 60 * 60 * 1000,
    private readonly imageScanner:ReceiptImageScanner =
      new PassthroughReceiptImageScanner(),
    private readonly observeMediaMetric:WhatsAppMediaMetricObserver =
      () => undefined,
  ){}


  async process(
    input:{
      workspaceId:string;
      instanceName:string;
      messageId:string;
      message:Record<string, unknown>;
      media:EvolutionMediaDescriptor;
      receiptsFolderId:string;
      receiptOutputFormat?:ReceiptOutputFormat;
    },
  ):Promise<ReceiptPipelineResult>{

    if(input.media.kind !== "image"){

      return {
        status:"ignored",
        source:"RECEIPT",
        reason:"NON_RECEIPT_MEDIA_IGNORED",
      };

    }


    const idempotencyKey =
      this.key(
        input.workspaceId,
        input.messageId,
      );

    this.prune(
      Date.now(),
    );

    if(
      this.processed.has(
        idempotencyKey,
      )
    ){

      return {
        status:"duplicate",
        source:"RECEIPT",
        reason:"RECEIPT_DUPLICATE_IGNORED",
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
        source:"RECEIPT",
        reason:
          downloaded.reason,
      };

    }


    const value =
      downloaded.value;

    let archiveMedia = value;

    try{
      this.imageScanner.validate?.(value);
    }catch(error){
      if(error instanceof ReceiptMediaValidationError){
        return {
          status:"failed",
          source:"RECEIPT",
          reason:error.message,
        };
      }
      return {
        status:"failed",
        source:"RECEIPT",
        reason:"RECEIPT_IMAGE_VALIDATION_FAILED",
      };
    }

    this.observeMediaMetric("classification_request");

    const extracted =
      await this.visionProvider.extractReceipt({
        image:
          value.bytes,
        mimeType:
          value.mimeType
          ||
          input.media.mimeType
          ||
          "image/jpeg",
        fileName:
          value.fileName
          ||
          input.media.fileName
          ||
          "receipt.jpg",
      });

    if(extracted.status !== "success"){

      return {
        status:"failed",
        source:"RECEIPT",
        reason:
          extracted.reason,
      };

    }


    this.processed.set(
      idempotencyKey,
      Date.now() + this.idempotencyTtlMs,
    );

    const extraction =
      extracted.value;

    if(!this.isReceiptImage(extraction)){

      this.observeMediaMetric("classified_non_receipt");

      this.processed.set(
        idempotencyKey,
        Date.now() + this.idempotencyTtlMs,
      );

      return {
        status:"ignored",
        source:"RECEIPT",
        reason:"NON_RECEIPT_IMAGE_IGNORED",
      };

    }

    this.observeMediaMetric("classified_receipt");

    // Local scanning starts only after the media has passed the receipt
    // classifier. This keeps random/private company media out of scanner and
    // storage work while retaining the existing one-call Vision extraction.
    try{
      const scan = await this.imageScanner.scan(
        value,
        {
          outputFormat:
            input.receiptOutputFormat
            ??
            "pdf",
        },
      );
      archiveMedia = scan.archiveMedia;
      this.observeMediaMetric("scan_success");
      if(scan.archiveMedia.mimeType === "application/pdf"){
        this.observeMediaMetric("pdf_generated");
      }
    }catch{
      // Scan/PDF generation is best effort. A classified receipt may still
      // proceed as an in-memory draft using the validated original image.
      archiveMedia = value;
      this.observeMediaMetric("scan_fallback");
    }

    if(!input.receiptsFolderId.trim()){

      return {
        status:"failed",
        source:"RECEIPT",
        reason:"RECEIPT_FOLDER_NOT_CONFIGURED",
      };

    }

    const lowConfidence =
      extraction.confidence === undefined
      ||
      extraction.confidence <
      this.confidenceThreshold;

    if(lowConfidence){

      return {
        status:"confirmation_required",
        source:"RECEIPT",
        fileName:
          value.fileName,
        extraction,
        pendingUpload:{
          bytes:archiveMedia.bytes,
          mimeType:archiveMedia.mimeType,
          fileName:archiveMedia.fileName,
        },
        reason:
          "RECEIPT_LOW_CONFIDENCE_CONFIRMATION",
      };

    }

    return {
      status:"draft_ready",
      source:"RECEIPT",
      fileName:
        value.fileName,
      extraction,
      pendingUpload:{
        bytes:archiveMedia.bytes,
        mimeType:archiveMedia.mimeType,
        fileName:archiveMedia.fileName,
      },
    };

  }


  private isReceiptImage(
    extraction:ReceiptVisionCandidate,
  ){

    // Older deterministic providers did not emit documentKind. Keep them
    // compatible; Groq now always emits the explicit fail-closed decision.
    if(extraction.documentKind === undefined){
      return true;
    }

    if(extraction.documentKind !== "RECEIPT"){
      return false;
    }

    const rawText = extraction.rawText.trim();
    const hasPayableTotal =
      /\b(?:grand\s+total|total(?:\s+after\s+adj(?:ustment)?)?|amount(?:\s+paid)?|sub[ -]?total|bill|jumlah(?:\s+(?:bayar|dibayar))?|tl)\b[^\n]*\d[\d.,]*/iu
        .test(rawText);
    const hasTransactionContext =
      Boolean(extraction.merchantName?.trim())
      ||
      /\b(?:receipt|invoice|resit|date|tarikh|visa|mastercard|cash|tunai|card)\b/iu
        .test(rawText);

    return Boolean(
      extraction.amount?.trim()
      &&
      hasPayableTotal
      &&
      hasTransactionContext
      &&
      (extraction.receiptEvidence?.length ?? 0) >= 2,
    );

  }


  async storeConfirmedReceipt(
    input:{
      workspaceId:string;
      receiptsFolderId:string;
      media:PendingReceiptUpload;
    },
  ){

    return this.store(
      input,
      input.media,
    );

  }


  private async store(
    input:{
      workspaceId:string;
      receiptsFolderId:string;
    },
    media:{
      bytes:Uint8Array;
      mimeType:string;
      fileName:string;
    },
  ):Promise<{
    status:"success";
    receiptUrl:string;
    fileName:string;
  } | {
    status:"failed";
    source:"RECEIPT";
    reason:string;
  }>{

    try{

      const stored =
        await this.storage.store({
          workspaceId:
            input.workspaceId,
          receiptsFolderId:
            input.receiptsFolderId,
          fileName:
            media.fileName,
          mimeType:
            media.mimeType,
          bytes:
            media.bytes,
        });

      return {
        status:"success",
        receiptUrl:
          stored.url,
        fileName:
          stored.name,
      };

    }catch(error){

      return {
        status:"failed",
        source:"RECEIPT",
        reason:
          error instanceof Error
            ?
            error.message
            :
            "RECEIPT_STORAGE_FAILED",
      };

    }

  }


  private prune(
    now:number,
  ){

    for(const [key, expiresAt] of this.processed){

      if(expiresAt <= now){

        this.processed.delete(
          key,
        );

      }

    }

  }


  private key(
    workspaceId:string,
    messageId:string,
  ){

    return `${workspaceId}:${messageId}`;

  }

}
