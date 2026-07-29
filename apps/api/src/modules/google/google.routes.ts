import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleController,
} from "./google.controller.js";


import {
  requireRole,
  Roles,
} from "../../shared/auth/index.js";



export default async function googleRoutes(
  app:FastifyInstance,
){


  const controller =
    new GoogleController(
      app,
    );



  app.get(
    "/google/status",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.getStatus,
  );



  app.post(
    "/google/connect",
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
    "/google/disconnect",
    {
      preHandler:[
        requireRole(
          Roles.OWNER,
          Roles.ADMIN,
        ),
      ],
    },
    controller.disconnect,
  );


}
