import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSettingsRepository,
} from "./google-settings.repository.js";


import {
  GoogleSheetsService,
} from "../sheets/google-sheets.service.js";




import {
  TemplateProvisioner,
} from "../provisioner/template.provisioner.js";




import {
  WorkspaceRepository,
} from "../../workspace/workspace.repository.js";


import type {
  WorkspaceTemplateType,
} from "../provisioner/template.types.js";



export class GoogleSettingsService {


  private readonly repository:
    GoogleSettingsRepository;


  private readonly sheetsService:
    GoogleSheetsService;




  private readonly templateProvisioner:
    TemplateProvisioner;




  private readonly workspaceRepository:
    WorkspaceRepository;



  constructor(
    private readonly app:FastifyInstance,
  ){

    this.repository =
      new GoogleSettingsRepository(
        app.prisma,
      );


    this.sheetsService =
      new GoogleSheetsService(
        app,
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

    void title;


    const workspace =
      await this.workspaceRepository
        .findWorkspaceById(
          workspaceId,
        );


    const workspaceType:
      WorkspaceTemplateType =
        workspace?.type
        ??
        "PERSONAL";



    const provision =
      await this.templateProvisioner
        .provision({

          workspaceId,

          workspaceType:
            workspaceType,

        });


    if(provision.templateType !== workspaceType){

      throw new Error(
        `Google template type mismatch: workspace is ${workspaceType}, provisioned ${provision.templateType}`,
      );

    }



    const setting =
      await this.repository
        .upsert({

          workspaceId,

          spreadsheetId:
            provision.spreadsheetId,


          spreadsheetTitle:
            provision.spreadsheetTitle,


          backupSpreadsheetId:
            provision.backupSpreadsheetId,


          backupSpreadsheetTitle:
            provision.backupSpreadsheetTitle,


          templateType:
            provision.templateType,


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


    const backfill =
      await this.backfillTransactionsToSheet(
        workspaceId,
        [
          setting.spreadsheetId,

          setting.backupSpreadsheetId,
        ],
      );


    return {
      ...setting,

      backfilledTransactions:
        backfill.count,
    };

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




  private async backfillTransactionsToSheet(
    workspaceId:string,
    spreadsheetIds:Array<string | null>,
  ){

    const transactions =
      await this.app.prisma.transaction
        .findMany({

          where:{
            workspaceId,

            status:{
              not:
                "CANCELLED",
            },
          },

          include:{
            category:true,

            merchant:true,

            paymentMethod:true,
          },

          orderBy:{
            transactionDate:
              "asc",
          },

        });


    for(const transaction of transactions){

      const transactionIso =
        transaction.transactionDate
          .toISOString();

      const transactionDate =
        transactionIso
          .slice(
            0,
            10,
          );

      const transactionTime =
        transactionIso
          .slice(
            11,
            19,
          );


      const values = [

        transaction.id,

        transactionDate,

        transactionTime,

        transaction.type,

        transaction.category?.name
        ??
        "Others",

        transaction.merchant?.name
        ??
        "-",

        transaction.description
        ??
        "",

        transaction.amount
          .toString(),

        transaction.paymentMethod?.name
        ??
        "",

        "SYSTEM",

        "",

        transaction.receiptUrl
        ??
        "",

        transactionIso,

      ];


      for(const spreadsheetId of spreadsheetIds){

        if(!spreadsheetId){

          continue;

        }


        await this.sheetsService
          .appendRow(
            workspaceId,
            {
              spreadsheetId,

              range:
                "Transactions!A:M",

              values,

            },
          );

      }

    }


    return {
      count:
        transactions.length,
    };

  }


}
