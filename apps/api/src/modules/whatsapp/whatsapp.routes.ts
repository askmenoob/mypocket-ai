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


  app.get(
    "/whatsapp/qr",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.showWorkspaceQr,
  );


  app.get(
    "/whatsapp/status",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.workspaceStatus,
  );



  app.get(
    "/whatsapp/members",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.listMembers,
  );



  app.delete(
    "/whatsapp/members/:memberId/phone",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.unlinkMemberPhone,
  );



  app.post(
    "/whatsapp/members/link",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.linkMemberPhone,
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
