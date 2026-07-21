import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSettingsRepository,
} from "./google-settings.repository.js";



export class GoogleSettingsService {


  private readonly repository:
    GoogleSettingsRepository;



  constructor(
    app:FastifyInstance,
  ){

    this.repository =
      new GoogleSettingsRepository(
        app.prisma,
      );

  }





  async getSettings(
    workspaceId:string,
  ){

    return this.repository
      .findByWorkspaceId(
        workspaceId,
      );

  }





  async connectExistingSheet(
    input:{
      workspaceId:string;

      spreadsheetId:string;

      spreadsheetTitle?:string;

    },
  ){


    return this.repository
      .create({

        workspaceId:
          input.workspaceId,


        spreadsheetId:
          input.spreadsheetId,


        spreadsheetTitle:
          input.spreadsheetTitle,


        mode:
          "EXISTING_SHEET",

      });

  }





  async updateSheet(
    workspaceId:string,

    input:{
      spreadsheetId?:string;

      spreadsheetTitle?:string;

      transactionSheet?:string;

      dashboardSheet?:string;

    },
  ){


    return this.repository
      .update(
        workspaceId,
        input,
      );

  }





  async disconnect(
    workspaceId:string,
  ){

    return this.repository
      .delete(
        workspaceId,
      );

  }


}
