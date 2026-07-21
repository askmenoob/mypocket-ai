import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSettingsController,
} from "./google-settings.controller.js";



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
        app.authenticate,
      ],
    },
    controller.get,
  );



  app.post(
    "/settings/connect",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.connect,
  );



  app.post(
    "/settings/auto-create",
    {
      preHandler:[
        app.authenticate,
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
