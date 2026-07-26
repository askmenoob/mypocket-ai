import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSettingsRepository,
} from "./google-settings.repository.js";




import {
  TemplateProvisioner,
} from "../provisioner/template.provisioner.js";




import {
  WorkspaceRepository,
} from "../../workspace/workspace.repository.js";



export class GoogleSettingsService {


  private readonly repository:
    GoogleSettingsRepository;




  private readonly templateProvisioner:
    TemplateProvisioner;




  private readonly workspaceRepository:
    WorkspaceRepository;



  constructor(
    app:FastifyInstance,
  ){

    this.repository =
      new GoogleSettingsRepository(
        app.prisma,
      );




    this.templateProvisioner =
      new TemplateProvisioner(
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

    const workspace =
      await this.workspaceRepository
        .findWorkspaceById(
          workspaceId,
        );



    const provision =
      await this.templateProvisioner
        .provision({

          workspaceId,

          workspaceType:
            workspace?.type
            ??
            "PERSONAL",

        });



    return this.repository
      .upsert({

        workspaceId,

        spreadsheetId:
          provision.spreadsheetId,


        spreadsheetTitle:
          provision.spreadsheetTitle,


        templateType:
          workspace?.type
          ??
          "PERSONAL",


        rootFolderId:
          provision.rootFolderId,


        reportsFolderId:
          provision.reportsFolderId,


        receiptsFolderId:
          provision.receiptsFolderId,


        exportsFolderId:
          provision.exportsFolderId,


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
