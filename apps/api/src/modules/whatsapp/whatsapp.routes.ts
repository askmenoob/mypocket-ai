import type {
  FastifyInstance,
} from "fastify";


import {
  WhatsAppController,
} from "./whatsapp.controller.js";



export default async function whatsappRoutes(
  app:FastifyInstance,
){

  const controller =
    new WhatsAppController(
      app,
    );


  app.post(
    "/whatsapp/dev/transaction",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.createDevTransaction,
  );

}
