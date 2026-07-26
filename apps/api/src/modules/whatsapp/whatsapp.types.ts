export type WhatsAppTransactionType =
  | "EXPENSE"
  | "INCOME";



export interface ParsedWhatsAppTransaction {

  amount:string;

  currency:string;

  type:WhatsAppTransactionType;

  categoryName:string;

  description:string;

  transactionDate:string;

  rawText:string;

}



export interface WhatsAppDevTransactionInput {

  text:string;

  transactionDate?:string;

  currency?:string;

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
