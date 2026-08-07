import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSheetsService,
} from "../sheets/google-sheets.service.js";


import type {
  SheetInitializationInput,
} from "./sheet-initializer.types.js";



export class SheetInitializerService {


  private readonly sheets:
    GoogleSheetsService;



  constructor(
    app:FastifyInstance,
  ){

    this.sheets =
      new GoogleSheetsService(
        app,
      );

  }





  async initialize(
    input:SheetInitializationInput,
  ):Promise<void>{


    await this.initializeTransactions(
      input,
    );


    await this.initializeDashboard(
      input,
    );


    await this.initializeSettings(
      input,
    );

  }





  private async initializeTransactions(
    input:SheetInitializationInput,
  ){


    await this.sheets
      .updateRange(

        input.workspaceId,

        {

        spreadsheetId:
          input.spreadsheetId,

        range:
          "Transactions!A1:O1",

        values:[

          [
            "Transaction ID",
            "Date",
            "Time",
            "Type",
            "Category",
            "Merchant",
            "Description",
            "Amount",
            "Payment Method",
            "Source",
            "AI Confidence",
            "Receipt URL",
            "Created At",
            "Created By ID",
            "Created By Email",
          ],

        ],

        },
      );

  }





  private async initializeDashboard(
    input:SheetInitializationInput,
  ){


    await this.sheets
      .updateRange(

        input.workspaceId,

        {

        spreadsheetId:
          input.spreadsheetId,

        range:
          "Dashboard!A1:F10",

        values:[

          [
            "MyPocket AI Dashboard",
            "",
            "",
            "",
            "",
            "",
          ],

          [
            "Live summary from Transactions!A:O",
            "",
            "",
            "",
            "",
            "",
          ],

          [
            "Metric",
            "Value",
            "",
            "System",
            "Value",
            "",
          ],

          [
            "Total Income",
            "=IFERROR(SUMIF(Transactions!D:D,\"INCOME\",Transactions!H:H),0)",
            "",
            "Transaction Range",
            "Transactions!A:O",
            "",
          ],

          [
            "Total Expense",
            "=IFERROR(SUMIF(Transactions!D:D,\"EXPENSE\",Transactions!H:H),0)",
            "",
            "Amount Column",
            "H",
            "",
          ],

          [
            "Balance",
            "=IFERROR(SUMIF(Transactions!D:D,\"INCOME\",Transactions!H:H)-SUMIF(Transactions!D:D,\"EXPENSE\",Transactions!H:H),0)",
            "",
            "Timezone",
            "Asia/Kuala_Lumpur",
            "",
          ],

          [
            "Transactions",
            "=MAX(COUNTA(Transactions!A:A)-1,0)",
            "",
            "Template Version",
            "1.0",
            "",
          ],

          [
            "",
            "",
            "",
            "",
            "",
            "",
          ],

          [
            "Usage",
            "Do not rename sheet names or Transactions columns. Backend sync writes A:O.",
            "",
            "",
            "",
            "",
          ],

          [
            "Last Updated",
            new Date().toISOString(),
            "",
            "",
            "",
            "",
          ],

        ],

        },
      );

  }





  private async initializeSettings(
    input:SheetInitializationInput,
  ){


    await this.sheets
      .updateRange(

        input.workspaceId,

        {

        spreadsheetId:
          input.spreadsheetId,

        range:
          "Settings!A1:B7",

        values:[

          [
            "Workspace ID",
            input.workspaceId,
          ],

          [
            "Spreadsheet ID",
            input.spreadsheetId,
          ],

          [
            "Workspace Type",
            input.workspaceType,
          ],

          [
            "Created",
            new Date().toISOString(),
          ],

          [
            "System",
            "MyPocket AI",
          ],

          [
            "Version",
            "1.0.0",
          ],

          [
            "Status",
            "ACTIVE",
          ],

        ],

        },
      );

  }


}
