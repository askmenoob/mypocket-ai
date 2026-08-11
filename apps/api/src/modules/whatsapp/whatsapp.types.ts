import type {
  EvolutionMediaDescriptor,
  EvolutionMediaKind,
} from "./whatsapp-media.js";


export type WhatsAppTransactionType =
  | "EXPENSE"
  | "INCOME";



export interface ParsedWhatsAppTransaction {

  amount:string;

  currency:string;

  type:WhatsAppTransactionType;

  categoryName:string;

  merchantName?:string;

  paymentMethodName?:string;

  description:string;

  transactionDate:string;

  rawText:string;

}



export interface WhatsAppDevTransactionInput {

  text:string;

  transactionDate?:string;

  currency?:string;

  source?:string;

  user:{
    userId:string;
    workspaceId:string;
    role:
      | "OWNER"
      | "ADMIN"
      | "MEMBER";
  };

}



export interface WhatsAppDevInstanceInput {

  workspaceId:string;

  instanceName:string;

  phoneNumber?:string;

}



export interface NormalizedEvolutionMessage {

  accepted:boolean;

  reason?:string;

  event?:string;

  instanceName?:string;

  fromMe?:boolean;

  remoteJid?:string;

  participantJid?:string;

  pushName?:string;

  messageId?:string;

  messageType?:
    | "text"
    | EvolutionMediaKind;

  media?:EvolutionMediaDescriptor;

  text?:string;

  timestamp?:string;

}
