import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleController,
} from "./google.controller.js";



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
        app.authenticate,
      ],
    },
    controller.connect,
  );



  app.post(
    "/google/disconnect",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.disconnect,
  );


}
