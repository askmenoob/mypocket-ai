export type TransactionType =
  | "EXPENSE"
  | "INCOME";


export type TransactionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED";


export interface CreateTransactionInput {

  workspaceId:string;

  createdById:string;

  amount:string;

  currency?:string;

  type:TransactionType;

  description?:string;

  transactionDate:Date;

  categoryId?:string;

  merchantId?:string;

  paymentMethodId?:string;

  receiptUrl?:string;

}


export interface UpdateTransactionInput {

  amount?:string;

  type?:TransactionType;

  status?:TransactionStatus;

  description?:string;

  categoryId?:string;

  merchantId?:string;

  paymentMethodId?:string;

  receiptUrl?:string;

}
