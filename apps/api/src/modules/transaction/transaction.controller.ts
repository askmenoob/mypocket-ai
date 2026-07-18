import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";


import {
  TransactionService,
} from "./transaction.service.js";


import {
  createTransactionSchema,
  updateTransactionSchema,
} from "./transaction.schemas.js";



export class TransactionController {


  private readonly service:
    TransactionService;



  constructor(
    app:FastifyInstance,
  ){

    this.service =
      new TransactionService(
        app,
      );

  }





  getTransactions =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;

    console.log(
      "TRANSACTION JWT USER:",
      JSON.stringify(user, null, 2)
    );


    const result =
      await this.service
        .getTransactions(
          user.workspaceId,
        );


    return reply.send(
      result,
    );

  }





  createTransaction =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;


    const body =
      createTransactionSchema
        .parse(
          request.body,
        );


    const result =
      await this.service
        .createTransaction(
          user.role,
          {
            ...body,

            workspaceId:
              user.workspaceId,

            createdById:
              user.userId,

            transactionDate:
              new Date(
                body.transactionDate,
              ),

          },
        );


    return reply
      .code(201)
      .send(
        result,
      );

  }





  updateTransaction =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;


    const params =
      request.params as {
        id:string;
      };


    const body =
      updateTransactionSchema
        .parse(
          request.body,
        );


    const result =
      await this.service
        .updateTransaction(
          user.role,
          user.workspaceId,
          params.id,
          body,
        );


    return reply.send(
      result,
    );

  }





  deleteTransaction =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;


    const params =
      request.params as {
        id:string;
      };


    const result =
      await this.service
        .deleteTransaction(
          user.role,
          user.workspaceId,
          params.id,
        );


    return reply.send(
      result,
    );

  };


}
