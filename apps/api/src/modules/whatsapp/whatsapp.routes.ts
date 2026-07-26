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


  app.get(
    "/whatsapp/dev/qr",
    controller.showDevQr,
  );


  app.post(
    "/whatsapp/dev/instance",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.registerDevInstance,
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


  app.post(
    "/whatsapp/evolution/webhook",
    controller.receiveEvolutionWebhook,
  );

}
