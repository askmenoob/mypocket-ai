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





  async appendRow(
    workspaceId:string,
    input:AppendRowInput,
  ):Promise<void>{


    const sheets =
      await this.getClient(
        workspaceId,
      );


    await sheets
      .spreadsheets
      .values
      .append({

        spreadsheetId:
          input.spreadsheetId,


        range:
          input.range,


        valueInputOption:
          "USER_ENTERED",


        requestBody:{

          values:[
            input.values,
          ],

        },

      });

  }





  async updateRange(
    workspaceId:string,
    input:{
      spreadsheetId:string;
      range:string;
      values:string[][];
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


}
