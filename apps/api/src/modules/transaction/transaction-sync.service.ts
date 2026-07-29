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

    const spreadsheetIds =
      [
        spreadsheetId,

        setting.backupSpreadsheetId,
      ]
        .filter(
          Boolean,
        ) as string[];


    const transactionIso =
      payload.transactionDate
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

      payload.transactionId,

      transactionDate,

      transactionTime,

      payload.type,

      payload.category,

      payload.merchant,

      payload.description,

      payload.amount,

      payload.paymentMethod
      ??
      "",

      payload.source
      ??
      "SYSTEM",

      "",

      "",

      transactionIso,

      payload.createdById
      ??
      "",

      payload.createdByEmail
      ??
      "",

    ];


    for(const spreadsheetId of spreadsheetIds){

      await this.sheetsService
        .appendRow(
          payload.workspaceId,
          {
            spreadsheetId,

            range:
              "Transactions!A:O",

            values,

          },
        );

    }

  }


}
