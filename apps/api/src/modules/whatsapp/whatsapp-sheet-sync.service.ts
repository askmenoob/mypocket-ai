import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSheetsService,
} from "../google/sheets/google-sheets.service.js";



export class WhatsAppSheetSyncService {


  private readonly sheetsService:
    GoogleSheetsService;



  constructor(
    private readonly app:FastifyInstance,
  ){

    this.sheetsService =
      new GoogleSheetsService(
        app,
      );

  }





  async safeUpdateTransactionRow(
    workspaceId:string,

    transaction:any,
  ):Promise<void>{

    try{

      await this.updateTransactionRow(
        workspaceId,
        transaction,
      );

    }catch(error){

      console.error(
        "GOOGLE_SHEET_TRANSACTION_UPDATE_FAILED:",
        error,
      );

    }

  }





  async updateTransactionRow(
    workspaceId:string,

    transaction:any,
  ):Promise<void>{

    const setting =
      await this.app.prisma.workspaceGoogleSetting
        .findUnique({
          where:{
            workspaceId,
          },
        });


    if(!setting){

      return;

    }


    const rows =
      await this.sheetsService
        .readRange(
          workspaceId,
          {
            spreadsheetId:
              setting.spreadsheetId,

            range:
              "Transactions!A:M",
          },
        );


    const rowIndex =
      rows.findIndex(
        (row) =>
          String(
            row[0]
            ??
            "",
          )
          ===
          transaction.id,
      );


    if(rowIndex < 1){

      return;

    }


    const rowNumber =
      rowIndex
      +
      1;


    const transactionIso =
      new Date(
        transaction.transactionDate,
      )
        .toISOString();

    const createdIso =
      new Date(
        transaction.createdAt,
      )
        .toISOString();


    await this.sheetsService
      .updateRange(
        workspaceId,
        {
          spreadsheetId:
            setting.spreadsheetId,

          range:
            `Transactions!A${rowNumber}:M${rowNumber}`,

          values:[
            [
              String(
                transaction.id
                ??
                "",
              ),

              transactionIso.slice(
                0,
                10,
              ),

              transactionIso.slice(
                11,
                19,
              ),

              String(
                transaction.type
                ??
                "",
              ),

              String(
                transaction.category?.name
                ??
                "",
              ),

              String(
                transaction.merchant?.name
                ??
                "-",
              ),

              String(
                transaction.description
                ??
                "",
              ),

              String(
                transaction.amount
                ??
                "",
              ),

              String(
                transaction.paymentMethod?.name
                ??
                "",
              ),

              String(
                transaction.source
                ??
                "WHATSAPP",
              ),

              "",

              String(
                transaction.receiptUrl
                ??
                "",
              ),

              createdIso,
            ],
          ],
        },
      );

  }





  async safeMarkCancelled(
    workspaceId:string,

    transactionId:string,
  ):Promise<void>{

    try{

      await this.markCancelled(
        workspaceId,
        transactionId,
      );

    }catch(error){

      console.error(
        "GOOGLE_SHEET_UNDO_MARK_FAILED:",
        error,
      );

    }

  }





  async markCancelled(
    workspaceId:string,

    transactionId:string,
  ):Promise<void>{

    const setting =
      await this.app.prisma.workspaceGoogleSetting
        .findUnique({
          where:{
            workspaceId,
          },
        });


    if(!setting){

      return;

    }


    const rows =
      await this.sheetsService
        .readRange(
          workspaceId,
          {
            spreadsheetId:
              setting.spreadsheetId,

            range:
              "Transactions!A:M",
          },
        );


    const rowIndex =
      rows.findIndex(
        (row) =>
          String(
            row[0]
            ??
            "",
          )
          ===
          transactionId,
      );


    if(rowIndex < 1){

      return;

    }


    const rowNumber =
      rowIndex
      +
      1;


    const row =
      rows[rowIndex]
      ??
      [];


    const description =
      String(
        row[6]
        ??
        "",
      );


    if(
      description.startsWith(
        "[CANCELLED]",
      )
    ){

      return;

    }


    await this.sheetsService
      .updateRange(
        workspaceId,
        {
          spreadsheetId:
            setting.spreadsheetId,

          range:
            `Transactions!G${rowNumber}:G${rowNumber}`,

          values:[
            [
              `[CANCELLED] ${description}`
                .trim(),
            ],
          ],
        },
      );

  }


}
