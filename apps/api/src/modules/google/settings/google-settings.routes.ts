import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSettingsController,
} from "./google-settings.controller.js";


import {
  requireRole,
  Roles,
} from "../../../shared/auth/index.js";



export default async function googleSettingsRoutes(
  app:FastifyInstance,
){

  const controller =
    new GoogleSettingsController(
      app,
    );



  app.get(
    "/settings",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.get,
  );



  app.post(
    "/settings/connect",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.connect,
  );



  app.post(
    "/settings/auto-create",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.autoCreate,
  );




  app.delete(
    "/settings",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.delete,
  );

}
