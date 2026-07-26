export interface TransactionSyncPayload {

  workspaceId:
    string;


  transactionId:
    string;


  amount:
    string;


  currency:
    string;


  type:
    string;


  category:
    string;


  merchant:
    string;


  paymentMethod:
    string;


  description:
    string;


  transactionDate:
    Date;


  source?:string;

}
