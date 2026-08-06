export type AIProviderCapability =
  | "text"
  | "vision";


export interface AITransactionParseInput {

  text:string;

  transactionDate?:string;

  currency?:string;

}


export type AIProviderAttemptStatus =
  | "success"
  | "unavailable"
  | "failed"
  | "invalid";


export interface AIProviderSuccess<T> {

  status:"success";

  provider:string;

  value:T;

}


export interface AIProviderNonSuccess {

  status:
    Exclude<
      AIProviderAttemptStatus,
      "success"
    >;

  provider:string;

  reason:string;

}


export type AIProviderResult<T> =
  | AIProviderSuccess<T>
  | AIProviderNonSuccess;


export interface AIProviderAttempt {

  provider:string;

  status:AIProviderAttemptStatus;

  reason?:string;

}


export interface AIRouterResult<T> {

  value:T;

  source:
    | "deterministic"
    | string;

  attempts:AIProviderAttempt[];

}
