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
          "Transactions!A1:H1",

        values:[

          [
            "Date",
            "Type",
            "Category",
            "Merchant",
            "Description",
            "Amount",
            "Currency",
            "Transaction ID",
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
          "Dashboard!A1:B6",

        values:[

          [
            "MyPocket Dashboard",
            "",
          ],

          [
            "",
            "",
          ],

          [
            "Total Income",
            "0",
          ],

          [
            "Total Expense",
            "0",
          ],

          [
            "Balance",
            "0",
          ],

          [
            "Transaction Count",
            "0",
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
          "Settings!A1:B5",

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

        ],

        },
      );

  }


}
