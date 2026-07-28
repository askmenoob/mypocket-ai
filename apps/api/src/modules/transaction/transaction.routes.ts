import type {
  FastifyInstance,
} from "fastify";


import {
  TransactionController,
} from "./transaction.controller.js";



export default async function transactionRoutes(
  app:FastifyInstance,
){

  const controller =
    new TransactionController(
      app,
    );



  app.get(
    "/transactions",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.getTransactions,
  );



  app.get(
    "/transactions/sheet",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.getSheetTransactions,
  );



  app.post(
    "/transactions",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.createTransaction,
  );



  app.patch(
    "/transactions/:id",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.updateTransaction,
  );



  app.delete(
    "/transactions/:id",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.deleteTransaction,
  );

}
