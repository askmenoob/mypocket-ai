import type {
  FastifyInstance,
} from "fastify";


import {
  randomUUID,
} from "node:crypto";


import {
  TransactionRepository,
} from "./transaction.repository.js";


import {
  TransactionSyncService,
} from "./transaction-sync.service.js";


import {
  GoogleSheetsService,
} from "../google/sheets/google-sheets.service.js";


import {
  GoogleSettingsRepository,
} from "../google/settings/google-settings.repository.js";


import {
  AppError,
} from "../../shared/errors/index.js";


import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "./transaction.types.js";



export class TransactionService {


  private readonly repository:
    TransactionRepository;


  private readonly app:
    FastifyInstance;


  private readonly syncService:
    TransactionSyncService;


  private readonly sheetsService:
    GoogleSheetsService;


  private readonly googleSettingsRepository:
    GoogleSettingsRepository;



  constructor(
    app:FastifyInstance,
  ){


    this.app =
      app;


    this.repository =

      new TransactionRepository(
        app.prisma,
      );


    this.syncService =

      new TransactionSyncService(
        app,
      );


    this.sheetsService =

      new GoogleSheetsService(
        app,
      );


    this.googleSettingsRepository =

      new GoogleSettingsRepository(
        app.prisma,
      );


  }





  async getTransactions(
    workspaceId:string,
  ){

    return this.repository
      .findTransactions(
        workspaceId,
      );

  }




  async getSheetTransactions(
    workspaceId:string,
  ){

    const setting =
      await this.googleSettingsRepository
        .findByWorkspaceId(
          workspaceId,
        );


    if(!setting?.spreadsheetId){

      return [];

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


    return rows
      .slice(
        1,
      )
      .map(
        (row) => this.parseSheetTransactionRow(
          row,
        ),
      )
      .filter(
        (transaction) => Boolean(
          transaction,
        ),
      );

  }





  async createTransaction(
    actorRole:
      "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",

    input:CreateTransactionInput,
  ){


    if(
      actorRole === "VIEWER"
    ){

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Viewer cannot create transaction",
        403,
      );

    }



    const transaction =
      await this.buildSheetOnlyTransaction(
        input,
      );


    try{

      await this.syncService
        .sync({

          workspaceId:
            transaction.workspaceId,

          transactionId:
            transaction.id,

          amount:
            transaction.amount,

          currency:
            transaction.currency,

          type:
            transaction.type,

          category:
            transaction.category?.name
            ??
            "Others",

          merchant:
            transaction.merchant?.name
            ??
            "-",

          paymentMethod:
            transaction.paymentMethod?.name
            ??
            "",

          description:
            transaction.description
            ??
            "",

          transactionDate:
            transaction.transactionDate,

          source:
            input.source
            ??
            "SYSTEM",

        });

    }catch(error){

      console.error(
        "GOOGLE SHEET WRITE FAILED:",
        error,
      );

      throw new AppError(
        "GOOGLE_SHEET_WRITE_FAILED",
        "Transaction could not be saved to Google Sheet",
        502,
      );

    }


    return transaction;


  }





  async updateTransaction(
    actorRole:
      "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",

    workspaceId:string,

    id:string,

    input:UpdateTransactionInput,
  ){



    if(
      actorRole !== "OWNER"
      &&
      actorRole !== "ADMIN"
    ){

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Not allowed to update transaction",
        403,
      );

    }





    const transaction =

      await this.repository
        .findTransaction(
          workspaceId,
          id,
        );





    if(!transaction){


      throw new AppError(
        "TRANSACTION_NOT_FOUND",
        "Transaction not found",
        404,
      );


    }





    return this.repository
      .updateTransaction(
        workspaceId,
        id,
        input,
      );


  }





  async deleteTransaction(
    actorRole:
      "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",

    workspaceId:string,

    id:string,
  ){



    if(
      actorRole !== "OWNER"
      &&
      actorRole !== "ADMIN"
    ){

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Not allowed to delete transaction",
        403,
      );

    }





    const transaction =

      await this.repository
        .findTransaction(
          workspaceId,
          id,
        );





    if(!transaction){


      throw new AppError(
        "TRANSACTION_NOT_FOUND",
        "Transaction not found",
        404,
      );


    }





    return this.repository
      .deleteTransaction(
        workspaceId,
        id,
      );


  }




  private async buildSheetOnlyTransaction(
    input:CreateTransactionInput,
  ){

    const [
      category,
      merchant,
      paymentMethod,
      workspace,
    ] =
      await Promise.all([
        input.categoryId
          ? this.app.prisma.category
            .findFirst({
              where:{
                id:
                  input.categoryId,

                workspaceId:
                  input.workspaceId,
              },
              select:{
                id:true,
                name:true,
              },
            })
          : null,

        input.merchantId
          ? this.app.prisma.merchant
            .findFirst({
              where:{
                id:
                  input.merchantId,

                workspaceId:
                  input.workspaceId,
              },
              select:{
                id:true,
                name:true,
              },
            })
          : null,

        input.paymentMethodId
          ? this.app.prisma.paymentMethod
            .findFirst({
              where:{
                id:
                  input.paymentMethodId,

                workspaceId:
                  input.workspaceId,
              },
              select:{
                id:true,
                name:true,
              },
            })
          : null,

        this.app.prisma.workspace
          .findUnique({
            where:{
              id:
                input.workspaceId,
            },
            select:{
              type:true,
            },
          }),
      ]);


    const now =
      new Date();


    return {

      id:
        `cm${randomUUID().replaceAll("-", "")}`,

      workspaceId:
        input.workspaceId,

      createdById:
        input.createdById,

      amount:
        input.amount,

      currency:
        input.currency
        ??
        "MYR",

      type:
        input.type,

      status:
        "PENDING" as const,

      description:
        input.description
        ??
        null,

      transactionDate:
        input.transactionDate,

      categoryId:
        input.categoryId
        ??
        null,

      merchantId:
        input.merchantId
        ??
        null,

      paymentMethodId:
        input.paymentMethodId
        ??
        null,

      receiptUrl:
        input.receiptUrl
        ??
        null,

      createdAt:
        now,

      updatedAt:
        now,

      category,

      merchant,

      paymentMethod,

      workspace,

    };

  }




  private parseSheetTransactionRow(
    row:unknown[],
  ){

    const valueAt =
      (index:number) =>
        String(
          row[index]
          ??
          "",
        )
          .trim();


    const id =
      valueAt(
        0,
      );


    const description =
      valueAt(
        6,
      );


    if(
      !id.startsWith(
        "cm",
      )
      ||
      description.startsWith(
        "[CANCELLED]",
      )
    ){

      return null;

    }


    const type =
      valueAt(
        3,
      ) === "INCOME"
        ? "INCOME"
        : "EXPENSE";


    const transactionDate =
      this.resolveSheetTransactionDate(
        valueAt(
          1,
        ),
        valueAt(
          2,
        ),
        valueAt(
          12,
        ),
      );


    const categoryName =
      valueAt(
        4,
      );


    const merchantName =
      valueAt(
        5,
      );


    const paymentMethodName =
      valueAt(
        8,
      );


    return {

      id,

      amount:
        valueAt(
          7,
        )
        ||
        "0",

      currency:
        "MYR",

      type,

      description:
        description
        ||
        null,

      transactionDate,

      source:
        valueAt(
          9,
        )
        ||
        "GOOGLE_SHEET",

      category:
        categoryName
          ? {
            name:
              categoryName,
          }
          : null,

      merchant:
        merchantName
        &&
        merchantName !== "-"
          ? {
            name:
              merchantName,
          }
          : null,

      paymentMethod:
        paymentMethodName
          ? {
            name:
              paymentMethodName,
          }
          : null,

    };

  }




  private resolveSheetTransactionDate(
    date:string,
    time:string,
    createdAt:string,
  ){

    const createdDate =
      new Date(
        createdAt,
      );


    if(!Number.isNaN(
      createdDate.getTime(),
    )){

      return createdDate
        .toISOString();

    }


    const combinedDate =
      new Date(
        `${date}T${time || "00:00:00"}.000Z`,
      );


    if(!Number.isNaN(
      combinedDate.getTime(),
    )){

      return combinedDate
        .toISOString();

    }


    return new Date()
      .toISOString();

  }



}
