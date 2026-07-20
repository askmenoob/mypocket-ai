export type WorkspaceType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";



export interface AppsScriptRequest {


  workspace:WorkspaceType;


  action:
    | "ADD_TRANSACTION"
    | "GET_TRANSACTIONS"
    | "GENERATE_REPORT";


  data?:unknown;


  year?:number;


  month?:number;


}





export interface AppsScriptResponse<T = unknown>{


  success:boolean;


  data?:T;


  error?:string;


}
