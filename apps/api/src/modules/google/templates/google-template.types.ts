export type WorkspaceTemplateType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";


export type GoogleTemplateTier =
  | "BASIC"
  | "PRO";



export interface GoogleTemplateRecord {

  id:
    string;


  type:
    WorkspaceTemplateType;


  name:
    string;


  spreadsheetId:
    string;


  version:
    string;


  active:
    boolean;

}
