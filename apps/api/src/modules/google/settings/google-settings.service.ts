import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSettingsRepository,
} from "./google-settings.repository.js";


import {
  SpreadsheetProvisioner,
} from "../provisioner/spreadsheet.provisioner.js";


import {
  SheetInitializerService,
} from "../initializer/sheet-initializer.service.js";


import {
  WorkspaceRepository,
} from "../../workspace/workspace.repository.js";



export class GoogleSettingsService {


  private readonly repository:
    GoogleSettingsRepository;


  private readonly provisioner:
    SpreadsheetProvisioner;


  private readonly initializer:
    SheetInitializerService;


  private readonly workspaceRepository:
    WorkspaceRepository;



  constructor(
    app:FastifyInstance,
  ){

    this.repository =
      new GoogleSettingsRepository(
        app.prisma,
      );


    this.provisioner =
      new SpreadsheetProvisioner(
        app,
      );


    this.initializer =
      new SheetInitializerService(
        app,
      );


    this.workspaceRepository =
      new WorkspaceRepository(
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
      .upsert({

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






  async autoCreateSheet(
    workspaceId:string,
    title:string,
  ){

    const spreadsheet =
      await this.provisioner
        .create({

          workspaceId,

          title,

        });



    const workspace =
      await this.workspaceRepository
        .findWorkspaceById(
          workspaceId,
        );



    await this.initializer
      .initialize({

        workspaceId,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        workspaceType:
          workspace?.type
          ??
          "PERSONAL",

      });



    return this.repository
      .upsert({

        workspaceId,

        spreadsheetId:
          spreadsheet.spreadsheetId,


        spreadsheetTitle:
          spreadsheet.title,


        mode:
          "AUTO_CREATED",

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
