import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSheetsService,
} from "../google/sheets/google-sheets.service.js";


import {
  GoogleSettingsRepository,
} from "../google/settings/google-settings.repository.js";


import type {
  TransactionSyncPayload,
} from "./transaction-sync.types.js";



export class TransactionSyncService {


  private readonly sheetsService:
    GoogleSheetsService;


  private readonly settingsRepository:
    GoogleSettingsRepository;



  constructor(
    app: FastifyInstance,
  ) {

    this.sheetsService =
      new GoogleSheetsService(
        app,
      );


    this.settingsRepository =
      new GoogleSettingsRepository(
        app.prisma,
      );

  }





  async sync(
    payload:
      TransactionSyncPayload,
  ):Promise<void> {


    const setting =
      await this.settingsRepository
        .findByWorkspaceId(
          payload.workspaceId,
        );


    if(!setting){

      console.log(
        "GOOGLE SHEET SYNC SKIPPED: NO SETTINGS",
      );

      return;

    }


    const spreadsheetId =
      setting.spreadsheetId;



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
