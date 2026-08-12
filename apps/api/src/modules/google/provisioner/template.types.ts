export type WorkspaceTemplateType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";


export type PersonalTemplateTier =
  | "BASIC"
  | "PRO";



export interface TemplateProvisionInput {

  workspaceId:
    string;



  rootFolderName?:
    string;
workspaceType:
    WorkspaceTemplateType;


  personalTier?:
    PersonalTemplateTier;

}



export interface TemplateProvisionResult {

  templateType:
    WorkspaceTemplateType;


  templateName:
    string;


  spreadsheetId:
    string;


  spreadsheetTitle:
    string;


  spreadsheetUrl:
    string;


  backupSpreadsheetId:
    string;


  backupSpreadsheetTitle:
    string;


  backupSpreadsheetUrl:
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
