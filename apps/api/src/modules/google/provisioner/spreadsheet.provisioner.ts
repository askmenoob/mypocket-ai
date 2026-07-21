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
  CreateSpreadsheetInput,
  SpreadsheetProvisionResult,
} from "./spreadsheet.types.js";



export class SpreadsheetProvisioner {


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





  async create(
    input:
      CreateSpreadsheetInput,
  ):Promise<SpreadsheetProvisionResult>{


    const accessToken =
      await this.tokenService
        .getValidAccessToken(
          input.workspaceId,
        );



    const auth =
      new google.auth.OAuth2();


    auth.setCredentials({

      access_token:
        accessToken,

    });



    const sheets =
      google.sheets({

        version:
          "v4",

        auth,

      });



    const response =
      await sheets
        .spreadsheets
        .create({

          requestBody:{

            properties:{

              title:
                input.title,

            },


            sheets:[

              {
                properties:{
                  title:"Transactions",
                },
              },

              {
                properties:{
                  title:"Dashboard",
                },
              },

              {
                properties:{
                  title:"Settings",
                },
              },

            ],

          },

        });



    const spreadsheetId =
      response.data.spreadsheetId
      ??
      "";



    return {

      spreadsheetId,

      title:
        response.data.properties?.title
        ??
        input.title,

      url:
        response.data.spreadsheetUrl
        ??
        "",

    };

  }


}
