export type WhatsAppTransactionType =
  | "EXPENSE"
  | "INCOME";



export interface ParsedWhatsAppTransaction {

  amount:string;

  currency:string;

  type:WhatsAppTransactionType;

  categoryName:string;

  merchantName?:string;

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
      | "MEMBER"
      | "VIEWER";
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

  remoteJid?:string;

  pushName?:string;

  messageId?:string;

  text?:string;

  timestamp?:string;

}
