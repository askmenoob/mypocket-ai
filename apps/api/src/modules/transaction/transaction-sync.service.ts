import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSheetsService,
} from "../google/sheets/google-sheets.service.js";


import type {
  TransactionSyncPayload,
} from "./transaction-sync.types.js";



export class TransactionSyncService {


  private readonly sheetsService:
    GoogleSheetsService;



  constructor(
    app: FastifyInstance,
  ) {

    this.sheetsService =
      new GoogleSheetsService(
        app,
      );

  }





  async sync(
    payload:
      TransactionSyncPayload,
  ):Promise<void> {


    const spreadsheetId =
      process.env.GOOGLE_SHEET_ID;


    if(!spreadsheetId){

      console.log(
        "GOOGLE SHEET SYNC SKIPPED: NO CONFIG",
      );

      return;

    }



    await this.sheetsService
      .appendRow(
        payload.workspaceId,
        {
          spreadsheetId,

          range:
            "Transactions!A:H",

          values:[

            payload.transactionDate
              .toISOString(),

            payload.type,

            payload.category,

            payload.merchant,

            payload.description,

            payload.amount,

            payload.currency,

            payload.transactionId,

          ],

        },
      );

  }


}
