export interface EvolutionMediaDownloadInput {

  instanceName:string;

  message:Record<string, unknown>;

}


export interface EvolutionMediaBytes {

  bytes:Uint8Array;

  mimeType:string;

  fileName:string;

}


export type EvolutionMediaDownloadResult =
  | {
      status:"success";
      provider:"evolution";
      value:EvolutionMediaBytes;
    }
  | {
      status:"unavailable" | "failed" | "invalid";
      provider:"evolution";
      reason:string;
    };


type FetchLike =
  (
    input:string,
    init?:RequestInit,
  ) => Promise<Response>;


interface EvolutionMediaDownloaderOptions {

  apiUrl:string;

  apiKey?:string;

  fetchImpl?:FetchLike;

  maxBytes?:number;

}


const DEFAULT_MAX_BYTES =
  25 * 1024 * 1024;


export class EvolutionMediaDownloader {

  readonly name =
    "evolution";


  private readonly fetchImpl:FetchLike;

  private readonly maxBytes:number;


  constructor(
    private readonly options:
      EvolutionMediaDownloaderOptions,
  ){

    this.fetchImpl =
      options.fetchImpl
      ??
      fetch;

    this.maxBytes =
      options.maxBytes
      ??
      DEFAULT_MAX_BYTES;

  }


  isAvailable(){

    return Boolean(
      this.options.apiUrl
      &&
      this.options.apiKey,
    );

  }


  async download(
    input:EvolutionMediaDownloadInput,
  ):Promise<EvolutionMediaDownloadResult>{

    if(!this.isAvailable()){

      return {
        status:"unavailable",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_CONFIGURATION_MISSING",
      };

    }


    const key =
      this.asRecord(
        input.message.key,
      );

    if(
      !this.asString(key.id)
    ){

      return {
        status:"invalid",
        provider:"evolution",
        reason:"MEDIA_MESSAGE_ID_MISSING",
      };

    }


    const endpoint =
      `${this.options.apiUrl.replace(/\/$/, "")}/chat/getBase64FromMediaMessage/${encodeURIComponent(input.instanceName)}`;

    let response:Response;

    try{

      response =
        await this.fetchImpl(
          endpoint,
          {
            method:"POST",
            headers:{
              apikey:
                this.options.apiKey!,
              "Content-Type":"application/json",
            },
            body:JSON.stringify({
              message:input.message,
              convertToMp4:false,
            }),
          },
        );

    }catch{

      return {
        status:"failed",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_REQUEST_FAILED",
      };

    }


    if(!response.ok){

      return {
        status:"failed",
        provider:"evolution",
        reason:
          `EVOLUTION_MEDIA_HTTP_${response.status}`,
      };

    }


    let payload:unknown;

    try{

      payload =
        await response.json();

    }catch{

      return {
        status:"invalid",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_RESPONSE_NOT_JSON",
      };

    }


    const root =
      this.asRecord(
        payload,
      );

    const data =
      this.asRecord(
        root.data,
      );

    const encoded =
      this.asString(
        root.base64,
      )
      ||
      this.asString(
        data.base64,
      )
      ||
      this.asString(
        root.media,
      )
      ||
      this.asString(
        data.media,
      );

    if(!encoded){

      return {
        status:"invalid",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_BASE64_MISSING",
      };

    }


    const normalizedBase64 =
      encoded.replace(
        /^data:[^;]+;base64,/i,
        "",
      );

    if(
      !/^[A-Za-z0-9+/]*={0,2}$/.test(
        normalizedBase64,
      )
    ){

      return {
        status:"invalid",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_BASE64_INVALID",
      };

    }


    const estimatedBytes =
      Math.floor(
        normalizedBase64.length * 3 / 4,
      );

    if(
      estimatedBytes > this.maxBytes
    ){

      return {
        status:"invalid",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_TOO_LARGE",
      };

    }


    const bytes =
      Uint8Array.from(
        Buffer.from(
          normalizedBase64,
          "base64",
        ),
      );

    if(
      bytes.byteLength === 0
    ){

      return {
        status:"invalid",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_EMPTY",
      };

    }

    if(
      bytes.byteLength > this.maxBytes
    ){

      return {
        status:"invalid",
        provider:"evolution",
        reason:"EVOLUTION_MEDIA_TOO_LARGE",
      };

    }


    return {
      status:"success",
      provider:"evolution",
      value:{
        bytes,
        mimeType:
          this.asString(
            root.mimetype
            ??
            root.mimeType
            ??
            data.mimetype
            ??
            data.mimeType,
          )
          ||
          "application/octet-stream",
        fileName:
          this.asString(
            root.fileName
            ??
            data.fileName,
          )
          ||
          "media.bin",
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

}
