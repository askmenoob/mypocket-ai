export type WorkspaceTemplateType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";



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
