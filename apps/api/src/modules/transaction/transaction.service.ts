import type {
  FastifyInstance,
} from "fastify";


import {
  TransactionRepository,
} from "./transaction.repository.js";


import {
  TransactionSyncService,
} from "./transaction-sync.service.js";


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


  private readonly syncService:
    TransactionSyncService;



  constructor(
    app:FastifyInstance,
  ){


    this.repository =

      new TransactionRepository(
        app.prisma,
      );


    this.syncService =

      new TransactionSyncService(
        app,
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

      await this.repository
        .createTransaction(
          input,
        );





    try{


      await this.syncService.sync({

        workspaceId:
          transaction.workspaceId,


        transactionId:
          transaction.id,


        amount:
          transaction.amount.toString(),


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
        "GOOGLE SHEET SYNC FAILED:",
        error,
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



}
