import type {
  EvolutionMediaKind,
} from "./whatsapp-media.js";


export type WhatsAppMediaIntentAction =
  | "PROCESS_AUDIO"
  | "PROCESS_RECEIPT_IMAGE"
  | "IGNORE";


export interface WhatsAppMediaIntentDecision {
  action:WhatsAppMediaIntentAction;
  reason:string;
}


export interface WhatsAppMediaIntentInput {
  isGroup:boolean;
  kind:EvolutionMediaKind;
  text?:string;
  botAlias?:string;
}


const RECEIPT_INTENT_PATTERN =
  /\b(?:resit|receipt|invoice|invois|bill|bil|expense|belanja|pembelian|purchase|bayaran|claim|tuntutan)\b/i;


function normalizeAlias(value:string | undefined):string{
  return (value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}


function extractTriggeredGroupText(
  text:string,
  botAlias:string | undefined,
):string | null{
  const trimmed = text.trim();

  if(trimmed.startsWith("!")){
    return trimmed.slice(1).trim();
  }

  const alias = normalizeAlias(botAlias);
  if(!alias){
    return null;
  }

  const token = `@${alias}`;
  const lower = trimmed.toLowerCase();
  if(
    lower === token
    || lower.startsWith(`${token} `)
    || lower.startsWith(`${token},`)
    || lower.startsWith(`${token}:`)
  ){
    return trimmed
      .slice(token.length)
      .replace(/^[\s,:]+/, "")
      .trim();
  }

  return null;
}


export function routeWhatsAppMediaIntent(
  input:WhatsAppMediaIntentInput,
):WhatsAppMediaIntentDecision{
  if(input.kind === "audio"){
    return {
      action:"PROCESS_AUDIO",
      reason:"AUDIO_PIPELINE",
    };
  }

  if(input.kind !== "image"){
    return {
      action:"IGNORE",
      reason:"NON_RECEIPT_MEDIA_IGNORED",
    };
  }

  if(!input.isGroup){
    return {
      action:"PROCESS_RECEIPT_IMAGE",
      reason:"PRIVATE_IMAGE_REQUIRES_RECEIPT_CLASSIFICATION",
    };
  }

  const triggeredText = extractTriggeredGroupText(
    input.text ?? "",
    input.botAlias,
  );

  if(
    !triggeredText
    || !RECEIPT_INTENT_PATTERN.test(triggeredText)
  ){
    return {
      action:"IGNORE",
      reason:"GROUP_MEDIA_RECEIPT_INTENT_REQUIRED",
    };
  }

  return {
    action:"PROCESS_RECEIPT_IMAGE",
    reason:"GROUP_RECEIPT_INTENT_CONFIRMED",
  };
}
