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

  valueRenderOption?:
    "FORMATTED_VALUE"
    |
    "UNFORMATTED_VALUE"
    |
    "FORMULA";

}



export interface AppendRowInput {

  spreadsheetId:
    string;


  range:
    string;


  values:
    unknown[];

  valueInputOption?:
    "RAW"
    |
    "USER_ENTERED";

}
