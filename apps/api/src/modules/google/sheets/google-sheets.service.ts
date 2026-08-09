import type {
  FastifyInstance,
} from "fastify";


import {
  google,
} from "googleapis";


import {
  GoogleTokenService,
} from "../token/google-token.service.js";


import type {
  SpreadsheetInfo,
  AppendRowInput,
  SheetRange,
} from "./google-sheets.types.js";



export class GoogleSheetsService {


  private readonly tokenService:
    GoogleTokenService;



  constructor(
    app:FastifyInstance,
  ){

    this.tokenService =
      new GoogleTokenService(
        app,
      );

  }





  private async getClient(
    workspaceId:string,
  ){

    const accessToken =
      await this.tokenService
        .getValidAccessToken(
          workspaceId,
        );


    const auth =
      new google.auth.OAuth2();


    auth.setCredentials({

      access_token:
        accessToken,

    });


    return google.sheets({

      version:
        "v4",

      auth,

    });

  }





  async getSpreadsheet(
    workspaceId:string,
    spreadsheetId:string,
  ):Promise<SpreadsheetInfo>{


    const sheets =
      await this.getClient(
        workspaceId,
      );


    const response =
      await sheets
        .spreadsheets
        .get({

          spreadsheetId,

        });



    return {

      spreadsheetId,

      title:
        response.data.properties?.title
        ??
        "",


      url:
        response.data.spreadsheetUrl
        ??
        "",

    };

  }





  async getSheetTitles(
    workspaceId:string,
    spreadsheetId:string,
  ):Promise<string[]>{

    const sheets =
      await this.getClient(
        workspaceId,
      );

    const response =
      await sheets
        .spreadsheets
        .get({
          spreadsheetId,

          fields:
            "sheets.properties.title",
        });

    return (
      response.data.sheets
      ??
      []
    )
      .map(
        (sheet) =>
          sheet.properties?.title
          ??
          "",
      )
      .filter(Boolean);

  }



  async getSpreadsheetMetadata(
    workspaceId:string,
    spreadsheetId:string,
  ){

    const sheets =
      await this.getClient(
        workspaceId,
      );

    const response =
      await sheets.spreadsheets
        .get({
          spreadsheetId,
          includeGridData:
            false,
        });

    const sheetTitles =
      (
        response.data.sheets
        ??
        []
      )
        .map(
          (sheet) =>
            sheet.properties
              ?.title
            ??
            "",
        )
        .filter(
          (title):
            title is string =>
              Boolean(
                title,
              ),
        );

    return {
      spreadsheetId:
        response.data.spreadsheetId
        ??
        spreadsheetId,

      title:
        response.data.properties
          ?.title
        ??
        "",

      sheetTitles,
    };
  }


  async hasAnyValues(
    workspaceId:string,
    spreadsheetId:string,
  ):Promise<boolean>{

    const sheets =
      await this.getClient(
        workspaceId,
      );

    const response =
      await sheets.spreadsheets
        .get({
          spreadsheetId,
          includeGridData:
            true,

          fields:
            "sheets(data(rowData(values(userEnteredValue,effectiveValue))))",
        });

    for(
      const sheet
      of response.data.sheets
      ??
      []
    ){

      for(
        const grid
        of sheet.data
        ??
        []
      ){

        for(
          const row
          of grid.rowData
          ??
          []
        ){

          for(
            const cell
            of row.values
            ??
            []
          ){

            const entered =
              cell.userEnteredValue;

            const effective =
              cell.effectiveValue;

            if(
              (
                entered
                &&
                Object.keys(
                  entered,
                ).length > 0
              )
              ||
              (
                effective
                &&
                Object.keys(
                  effective,
                ).length > 0
              )
            ){
              return true;
            }
          }
        }
      }
    }

    return false;
  }


  async createMissingSheets(
    workspaceId:string,

    input:{
      spreadsheetId:string;
      titles:string[];
    },
  ):Promise<void>{

    const metadata =
      await this.getSpreadsheetMetadata(
        workspaceId,
        input.spreadsheetId,
      );

    const existing =
      new Set(
        metadata.sheetTitles,
      );

    const missing =
      input.titles
        .filter(
          (title) =>
            !existing.has(
              title,
            ),
        );

    if(missing.length === 0){
      return;
    }

    const sheets =
      await this.getClient(
        workspaceId,
      );

    await sheets.spreadsheets
      .batchUpdate({
        spreadsheetId:
          input.spreadsheetId,

        requestBody:{
          requests:
            missing.map(
              (title) => ({
                addSheet:{
                  properties:{
                    title,
                  },
                },
              }),
            ),
        },
      });
  }


  async appendRow(
    workspaceId:string,
    input:AppendRowInput,
  ):Promise<{
    updatedRange:string;
  }>{


    const sheets =
      await this.getClient(
        workspaceId,
      );


    const response =
      await sheets
      .spreadsheets
      .values
      .append({

        spreadsheetId:
          input.spreadsheetId,


        range:
          input.range,


        valueInputOption:
          input.valueInputOption
          ??
          "USER_ENTERED",


        requestBody:{

          values:[
            input.values,
          ],

        },

      });

    return {
      updatedRange:
        response.data.updates?.updatedRange
        ?? "",
    };

  }





  async updateRange(
    workspaceId:string,
    input:{
      spreadsheetId:string;
      range:string;
      values:unknown[][];
      valueInputOption?:
        "RAW"
        |
        "USER_ENTERED";
    },
  ):Promise<void>{


    const sheets =
      await this.getClient(
        workspaceId,
      );



    await sheets
      .spreadsheets
      .values
      .update({

        spreadsheetId:
          input.spreadsheetId,


        range:
          input.range,


        valueInputOption:
          input.valueInputOption
          ??
          "USER_ENTERED",


        requestBody:{

          values:
            input.values,

        },

      });

  }






  async readRange(
    workspaceId:string,
    input:SheetRange,
  ):Promise<unknown[][]>{

    const sheets =
      await this.getClient(
        workspaceId,
      );


    const response =
      await sheets
        .spreadsheets
        .values
        .get({

          spreadsheetId:
            input.spreadsheetId,


          range:
            input.range,

        });


    return (
      response.data.values
      ??
      []
    );

  }


  async formatNumberRange(
    workspaceId:string,
    input:{
      spreadsheetId:string;
      sheetName:string;
      startRowIndex:number;
      endRowIndex:number;
      startColumnIndex:number;
      endColumnIndex:number;
      pattern?:string;
    },
  ):Promise<void>{
    const sheets =
      await this.getClient(
        workspaceId,
      );

    const metadata =
      await sheets.spreadsheets
        .get({
          spreadsheetId:
            input.spreadsheetId,
          fields:
            "sheets.properties(sheetId,title)",
        });

    const sheet =
      (
        metadata.data.sheets
        ?? []
      )
        .find(
          (item) =>
            item.properties?.title === input.sheetName,
        );

    const sheetId =
      sheet?.properties?.sheetId;

    if(sheetId === undefined || sheetId === null){
      return;
    }

    await sheets.spreadsheets
      .batchUpdate({
        spreadsheetId:
          input.spreadsheetId,
        requestBody:{
          requests:[
            {
              repeatCell:{
                range:{
                  sheetId,
                  startRowIndex:
                    input.startRowIndex,
                  endRowIndex:
                    input.endRowIndex,
                  startColumnIndex:
                    input.startColumnIndex,
                  endColumnIndex:
                    input.endColumnIndex,
                },
                cell:{
                  userEnteredFormat:{
                    numberFormat:{
                      type:
                        "NUMBER",
                      pattern:
                        input.pattern
                        ?? "0.00",
                    },
                  },
                },
                fields:
                  "userEnteredFormat.numberFormat",
              },
            },
          ],
        },
      });
  }


}
