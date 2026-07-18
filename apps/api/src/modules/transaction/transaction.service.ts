import type {
  FastifyInstance,
} from "fastify";


import {
  TransactionRepository,
} from "./transaction.repository.js";


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



  constructor(
    app:FastifyInstance,
  ){

    this.repository =
      new TransactionRepository(
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


    return this.repository
      .createTransaction(
        input,
      );

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
