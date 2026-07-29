import type {
  FastifyInstance,
} from "fastify";


import {
  WhatsAppController,
} from "./whatsapp.controller.js";


import {
  requireRole,
  Roles,
} from "../../shared/auth/index.js";



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
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
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


  app.post(
    "/whatsapp/instance/disconnect",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.resetWorkspaceInstance,
  );


  app.post(
    "/whatsapp/instance/reset",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.resetWorkspaceInstance,
  );



  app.get(
    "/whatsapp/members",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.listMembers,
  );



  app.delete(
    "/whatsapp/members/:memberId/phone",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.unlinkMemberPhone,
  );



  app.post(
    "/whatsapp/members/link",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.linkMemberPhone,
  );


  app.post(
    "/whatsapp/dev/instance",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.registerDevInstance,
  );


  app.post(
    "/whatsapp/dev/transaction",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.createDevTransaction,
  );


  app.post(
    "/whatsapp/evolution/webhook",
    controller.receiveEvolutionWebhook,
  );

}
