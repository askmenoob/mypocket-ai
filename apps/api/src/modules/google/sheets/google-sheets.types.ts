export interface SpreadsheetInfo {

  spreadsheetId:
    string;


  title:
    string;


  url:
    string;

}



export interface SheetRange {

  spreadsheetId:
    string;


  range:
    string;

}



export interface AppendRowInput {

  spreadsheetId:
    string;


  range:
    string;


  values:
    unknown[];

}
