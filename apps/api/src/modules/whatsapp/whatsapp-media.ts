export type EvolutionMediaKind =
  | "image"
  | "audio"
  | "video"
  | "document";


export interface EvolutionMediaDescriptor {

  kind:EvolutionMediaKind;

  mimeType?:string;

  fileName?:string;

  caption?:string;

  durationSeconds?:number;

  fileLength?:number;

}


type UnknownRecord = Record<string, unknown>;


const asRecord =
  (value:unknown):UnknownRecord =>
    value !== null
    &&
    typeof value === "object"
      ?
      value as UnknownRecord
      :
      {};


const asString =
  (value:unknown):string =>
    typeof value === "string"
      ?
      value.trim()
      :
      "";


const asFiniteNumber =
  (value:unknown):number | undefined => {

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

  };


export function extractEvolutionMedia(
  message:UnknownRecord,
):EvolutionMediaDescriptor | null {

  const candidates:Array<[
    EvolutionMediaKind,
    unknown,
  ]> = [
    ["image", message.imageMessage],
    ["audio", message.audioMessage],
    ["video", message.videoMessage],
    ["document", message.documentMessage],
  ];


  for(const [kind, raw] of candidates){

    if(
      raw === undefined
      ||
      raw === null
    ){

      continue;

    }


    const value =
      asRecord(
        raw,
      );


    const caption =
      asString(
        value.caption,
      );


    const fileName =
      asString(
        value.fileName
        ??
        value.title,
      );


    const mimeType =
      asString(
        value.mimetype,
      );


    const durationSeconds =
      asFiniteNumber(
        value.seconds,
      );


    const fileLength =
      asFiniteNumber(
        value.fileLength,
      );


    return {

      kind,

      ...(mimeType
        ? {mimeType}
        : {}),

      ...(fileName
        ? {fileName}
        : {}),

      ...(caption
        ? {caption}
        : {}),

      ...(durationSeconds !== undefined
        ? {durationSeconds}
        : {}),

      ...(fileLength !== undefined
        ? {fileLength}
        : {}),

    };

  }


  return null;

}
