import type {
  PrismaClient,
} from "../../../generated/prisma/client.js";


import type {
  WorkspaceGoogleSetting,
} from "../../../generated/prisma/client.js";



export class GoogleSettingsRepository {


  private readonly prisma:
    PrismaClient;



  constructor(
    prisma: PrismaClient,
  ){

    this.prisma =
      prisma;

  }





  async findByWorkspaceId(
    workspaceId:string,
  ):Promise<WorkspaceGoogleSetting | null>{


    return this.prisma
      .workspaceGoogleSetting
      .findUnique({

        where:{
          workspaceId,
        },

      });

  }






  async create(
    input:{
      workspaceId:string;
      spreadsheetId:string;
      spreadsheetTitle?:string;

      templateType?:string;

      rootFolderId?:string;

      reportsFolderId?:string;

      receiptsFolderId?:string;

      exportsFolderId?:string;

      transactionSheet?:string;
      dashboardSheet?:string;
      mode:
        "AUTO_CREATED"
        |
        "EXISTING_SHEET";
    },
  ){


    return this.prisma
      .workspaceGoogleSetting
      .create({

        data:{

          workspaceId:
            input.workspaceId,

          spreadsheetId:
            input.spreadsheetId,

          spreadsheetTitle:
            input.spreadsheetTitle,

          transactionSheet:
            input.transactionSheet
            ??
            "Transactions",

          dashboardSheet:
            input.dashboardSheet,

          mode:
            input.mode,

        },

      });

  }





  async upsert(
    input:{
      workspaceId:string;
      spreadsheetId:string;
      spreadsheetTitle?:string;

      templateType?:string;

      rootFolderId?:string;

      reportsFolderId?:string;

      receiptsFolderId?:string;

      exportsFolderId?:string;

      transactionSheet?:string;
      dashboardSheet?:string;
      mode:
        "AUTO_CREATED"
        |
        "EXISTING_SHEET";
    },
  ){


    return this.prisma
      .workspaceGoogleSetting
      .upsert({

        where:{
          workspaceId:
            input.workspaceId,
        },


        create:{

          workspaceId:
            input.workspaceId,

          spreadsheetId:
            input.spreadsheetId,

          spreadsheetTitle:
            input.spreadsheetTitle,

            templateType:
              input.templateType,

            rootFolderId:
              input.rootFolderId,

            reportsFolderId:
              input.reportsFolderId,

            receiptsFolderId:
              input.receiptsFolderId,

            exportsFolderId:
              input.exportsFolderId,

          transactionSheet:
            input.transactionSheet
            ??
            "Transactions",

          dashboardSheet:
            input.dashboardSheet,

          mode:
            input.mode,

        },


        update:{

          spreadsheetId:
            input.spreadsheetId,

          spreadsheetTitle:
            input.spreadsheetTitle,

            templateType:
              input.templateType,

            rootFolderId:
              input.rootFolderId,

            reportsFolderId:
              input.reportsFolderId,

            receiptsFolderId:
              input.receiptsFolderId,

            exportsFolderId:
              input.exportsFolderId,

          transactionSheet:
            input.transactionSheet
            ??
            "Transactions",

          dashboardSheet:
            input.dashboardSheet,

          mode:
            input.mode,

        },

      });

  }






  async update(
    workspaceId:string,
    data:{

      spreadsheetId?:string;

      spreadsheetTitle?:string;

      transactionSheet?:string;

      dashboardSheet?:string;

      mode?:
        "AUTO_CREATED"
        |
        "EXISTING_SHEET";

    },
  ){


    return this.prisma
      .workspaceGoogleSetting
      .update({

        where:{
          workspaceId,
        },

        data,

      });

  }





  async delete(
    workspaceId:string,
  ){


    return this.prisma
      .workspaceGoogleSetting
      .delete({

        where:{
          workspaceId,
        },

      });

  }


}
