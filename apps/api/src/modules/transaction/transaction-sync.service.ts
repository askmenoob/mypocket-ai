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

  private readonly preparedReceiptReferenceHeaders =
    new Set<string>();



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

      payload.aiConfidence
      ??
      "",

      payload.receiptUrl
      ??
      "",

      transactionIso,

      payload.createdById
      ??
      "",

      payload.createdByEmail
      ??
      "",

      payload.receiptReference
      ??
      "",

    ];


    for(const spreadsheetId of spreadsheetIds){

      await this.ensureReceiptReferenceHeader(
        payload.workspaceId,
        spreadsheetId,
      );

      const sheetTitles =
        payload.source === "WHATSAPP_RECEIPT"
        &&
        payload.receiptUrl
          ? await this.sheetsService
            .getSheetTitles(
              payload.workspaceId,
              spreadsheetId,
            )
          : [];

      await this.sheetsService
        .appendRow(
          payload.workspaceId,
          {
            spreadsheetId,

            range:
              "Transactions!A:P",

            values,

          },
        );

      if(
        sheetTitles.includes(
          "Receipts Checklist",
        )
      ){

        await this.sheetsService
          .appendRow(
            payload.workspaceId,
            {
              spreadsheetId,
              range:
                "Receipts Checklist!A:J",
              values:[
                payload.transactionDate
                  .getUTCFullYear(),
                transactionDate,
                payload.transactionId,
                payload.merchant,
                payload.category,
                payload.amount,
                payload.receiptUrl,
                "",
                "REVIEW",
                [
                  payload.receiptType
                    ? `Receipt type: ${payload.receiptType}`
                    : "",
                  payload.receiptClassificationSource
                    ? `Classification: ${payload.receiptClassificationSource}`
                    : "",
                  payload.receiptReference
                    ? `Reference: ${payload.receiptReference}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("; "),
              ],
            },
          );

      }

    }

  }


  private async ensureReceiptReferenceHeader(
    workspaceId:string,
    spreadsheetId:string,
  ){

    const cacheKey =
      `${workspaceId}:${spreadsheetId}`;

    if(
      this.preparedReceiptReferenceHeaders
        .has(
          cacheKey,
        )
    ){

      return;

    }

    const rows =
      await this.sheetsService
        .readRange(
          workspaceId,
          {
            spreadsheetId,
            range:
              "Transactions!P1:P1",
          },
        );

    const currentHeader =
      String(
        rows[0]?.[0]
        ??
        "",
      )
        .trim();

    if(
      currentHeader
      &&
      currentHeader !== "Receipt Reference"
    ){

      throw new Error(
        "TRANSACTION_RECEIPT_REFERENCE_HEADER_CONFLICT",
      );

    }

    if(!currentHeader){

      await this.sheetsService
        .updateRange(
          workspaceId,
          {
            spreadsheetId,
            range:
              "Transactions!P1:P1",
            values:[
              [
                "Receipt Reference",
              ],
            ],
          },
        );

    }

    this.preparedReceiptReferenceHeaders
      .add(
        cacheKey,
      );

  }


}
