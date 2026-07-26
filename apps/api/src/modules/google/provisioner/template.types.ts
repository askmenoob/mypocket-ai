export type WorkspaceTemplateType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";



export interface TemplateProvisionInput {

  workspaceId:
    string;


  workspaceType:
    WorkspaceTemplateType;

}



export interface TemplateProvisionResult {

  spreadsheetId:
    string;


  spreadsheetTitle:
    string;


  spreadsheetUrl:
    string;


  rootFolderId:
    string;


  reportsFolderId:
    string;


  receiptsFolderId:
    string;


  exportsFolderId:
    string;

}
