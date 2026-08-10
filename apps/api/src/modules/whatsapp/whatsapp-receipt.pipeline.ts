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
  ){}


  async process(
    input:{
      workspaceId:string;
      instanceName:string;
      messageId:string;
      message:Record<string, unknown>;
      media:EvolutionMediaDescriptor;
      receiptsFolderId:string;
    },
  ):Promise<ReceiptPipelineResult>{

    if(
      input.media.kind !== "image"
      &&
      input.media.kind !== "document"
    ){

      return {
        status:"unsupported",
        source:"RECEIPT",
        reason:"RECEIPT_MEDIA_KIND_UNSUPPORTED",
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


    if(!input.receiptsFolderId.trim()){

      return {
        status:"failed",
        source:"RECEIPT",
        reason:"RECEIPT_FOLDER_NOT_CONFIGURED",
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

    if(input.media.kind === "document"){

      const stored =
        await this.store(
          input,
          value,
        );

      if(stored.status === "failed"){

        return stored;

      }

      this.processed.set(
        idempotencyKey,
        Date.now() + this.idempotencyTtlMs,
      );

      return {
        status:"stored_pending_ocr",
        source:"RECEIPT",
        receiptUrl:
          stored.receiptUrl,
        fileName:
          stored.fileName,
      };

    }


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
          bytes:value.bytes,
          mimeType:value.mimeType,
          fileName:value.fileName,
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
        bytes:value.bytes,
        mimeType:value.mimeType,
        fileName:value.fileName,
      },
    };

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
