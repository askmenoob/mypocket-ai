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
    actor?:{
      userId:string;
      role:string;
    },
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
              "Transactions!A:O",
          },
        );


    const transactions =
      rows
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
        )
        .filter(
          (transaction:any) =>
            actor?.role === "MEMBER"
              ? transaction.createdById === actor.userId
              : true,
        ) as Array<any>;


    const members =
      await this.app.prisma.workspaceMember
        .findMany({
          where:{
            workspaceId,
          },

          select:{
            userId:true,

            user:{
              select:{
                name:true,
                email:true,
              },
            },
          },
        });


    const memberByUserId =
      new Map(
        members.map(
          (member) => [
            member.userId,
            member.user,
          ],
        ),
      );



    const sheetRecencyByTransactionId =


      new Map<


        string,


        {


          createdAtTimestamp:number;


          sourceRowIndex:number;


        }


      >();



    rows


      .slice(


        1,


      )


      .forEach(


        (


          row,


          sourceIndex,


        ) => {


          const transactionId =


            String(


              row[0]


              ??


              "",


            )


              .trim();



          if(!transactionId){


            return;


          }



          const createdAtValue =


            String(


              row[12]


              ??


              "",


            )


              .trim();



          sheetRecencyByTransactionId


            .set(


              transactionId,


              {


                createdAtTimestamp:


                  Date.parse(


                    createdAtValue,


                  ),



                sourceRowIndex:


                  sourceIndex


                  +


                  2,


              },


            );


        },


      );




    return transactions
      .map(
        (transaction) => {

          const recordedBy =
            memberByUserId.get(
              transaction.createdById,
            );


          return {
            ...transaction,

            createdBy:
              recordedBy
                ? {
                  id:
                    transaction.createdById,

                  name:
                    recordedBy.name,

                  email:
                    recordedBy.email,
                }
                : transaction.createdByEmail
                  ? {
                    id:
                      transaction.createdById
                      ||
                      "",

                    name:
                      null,

                    email:
                      transaction.createdByEmail,
                  }
                  : null,
          };

        },
      )
      .sort(
        (
          first,
          second,
        ) => {
          const firstRecency =
            sheetRecencyByTransactionId
              .get(
                String(
                  first.id
                  ??
                  "",
                ),
              );

          const secondRecency =
            sheetRecencyByTransactionId
              .get(
                String(
                  second.id
                  ??
                  "",
                ),
              );

          const firstCreatedAt =
            firstRecency
              ?.createdAtTimestamp;

          const secondCreatedAt =
            secondRecency
              ?.createdAtTimestamp;

          const firstHasCreatedAt =
            typeof firstCreatedAt
              ===
              "number"
            &&
            Number.isFinite(
              firstCreatedAt,
            );

          const secondHasCreatedAt =
            typeof secondCreatedAt
              ===
              "number"
            &&
            Number.isFinite(
              secondCreatedAt,
            );

          if(
            firstHasCreatedAt
            !==
            secondHasCreatedAt
          ){
            return firstHasCreatedAt
              ? -1
              : 1;
          }

          if(
            firstHasCreatedAt
            &&
            secondHasCreatedAt
            &&
            firstCreatedAt
              !==
              secondCreatedAt
          ){
            return (
              secondCreatedAt
              -
              firstCreatedAt
            );
          }

          const firstTransactionDate =
            new Date(
              first.transactionDate,
            ).getTime();

          const secondTransactionDate =
            new Date(
              second.transactionDate,
            ).getTime();

          const firstHasTransactionDate =
            Number.isFinite(
              firstTransactionDate,
            );

          const secondHasTransactionDate =
            Number.isFinite(
              secondTransactionDate,
            );

          if(
            firstHasTransactionDate
            !==
            secondHasTransactionDate
          ){
            return firstHasTransactionDate
              ? -1
              : 1;
          }

          if(
            firstHasTransactionDate
            &&
            secondHasTransactionDate
            &&
            firstTransactionDate
              !==
              secondTransactionDate
          ){
            return (
              secondTransactionDate
              -
              firstTransactionDate
            );
          }

          const firstSourceRow =
            firstRecency
              ?.sourceRowIndex
            ??
            Number.NEGATIVE_INFINITY;

          const secondSourceRow =
            secondRecency
              ?.sourceRowIndex
            ??
            Number.NEGATIVE_INFINITY;

          return (
            secondSourceRow
            -
            firstSourceRow
          );
        },
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

          createdById:
            input.createdById,

          createdByEmail:
            await this.resolveUserEmail(
              input.createdById,
            ),

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





  async bulkDeleteSheetTransactions(
    actorRole:
      "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",

    workspaceId:string,

    transactionIds:string[],
  ){

    if(
      actorRole !== "OWNER"
      &&
      actorRole !== "ADMIN"
    ){

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Not allowed to delete transactions",
        403,
      );

    }


    const normalizedIds =
      Array.from(
        new Set(
          transactionIds
            .map(
              (id) =>
                String(
                  id,
                )
                  .trim(),
            )
            .filter(
              Boolean,
            ),
        ),
      );


    if(
      normalizedIds.length === 0
      ||
      normalizedIds.length > 100
    ){

      throw new AppError(
        "INVALID_TRANSACTION_IDS",
        "Between 1 and 100 transaction IDs are required",
        400,
      );

    }


    const setting =
      await this.googleSettingsRepository
        .findByWorkspaceId(
          workspaceId,
        );


    if(!setting?.spreadsheetId){

      throw new AppError(
        "GOOGLE_SHEET_NOT_CONFIGURED",
        "Google Sheet is not configured",
        409,
      );

    }


    const spreadsheetIds =
      [
        setting.spreadsheetId,
        setting.backupSpreadsheetId,
      ]
        .filter(
          Boolean,
        )
        .filter(
          (
            spreadsheetId,
            index,
            values,
          ) =>
            values.indexOf(
              spreadsheetId,
            )
            ===
            index,
        ) as string[];


    const matchedIds =
      new Set<string>();


    for(
      const spreadsheetId
      of spreadsheetIds
    ){

      const rows =
        await this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId,

              range:
                "Transactions!A:O",
            },
          );


      const rowIndexById =
        new Map<
          string,
          number
        >();


      for(
        let rowIndex = 1;
        rowIndex < rows.length;
        rowIndex += 1
      ){

        const transactionId =
          String(
            rows[rowIndex]?.[0]
            ??
            "",
          )
            .trim();


        if(
          transactionId
          &&
          !rowIndexById.has(
            transactionId,
          )
        ){

          rowIndexById.set(
            transactionId,
            rowIndex,
          );

        }

      }


      for(
        const transactionId
        of normalizedIds
      ){

        const rowIndex =
          rowIndexById.get(
            transactionId,
          );


        if(
          rowIndex === undefined
          ||
          rowIndex < 1
        ){

          continue;

        }


        matchedIds.add(
          transactionId,
        );


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
            "[DELETED]",
          )
        ){

          continue;

        }


        const rowNumber =
          rowIndex
          +
          1;


        await this.sheetsService
          .updateRange(
            workspaceId,
            {
              spreadsheetId,

              range:
                `Transactions!G${rowNumber}:G${rowNumber}`,

              values:[
                [
                  `[DELETED] ${description}`
                    .trim(),
                ],
              ],
            },
          );

      }

    }


    const deletedIds =
      normalizedIds
        .filter(
          (transactionId) =>
            matchedIds.has(
              transactionId,
            ),
        );


    const missingIds =
      normalizedIds
        .filter(
          (transactionId) =>
            !matchedIds.has(
              transactionId,
            ),
        );


    return {
      requestedCount:
        normalizedIds.length,

      deletedCount:
        deletedIds.length,

      deletedIds,

      missingIds,

      marker:
        "[DELETED]",
    };

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




  private async resolveUserEmail(
    userId:string,
  ){

    const user =
      await this.app.prisma.user
        .findUnique({
          where:{
            id:
              userId,
          },
          select:{
            email:
              true,
          },
        });


    return user?.email
      ??
      "";

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
      ||
      description.startsWith(
        "[DELETED]",
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

      createdById:
        valueAt(
          13,
        )
        ||
        "",

      createdByEmail:
        valueAt(
          14,
        )
        ||
        "",

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
