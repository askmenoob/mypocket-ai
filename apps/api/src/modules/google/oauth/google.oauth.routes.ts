import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleOAuthController,
} from "./google.oauth.controller.js";



export default async function googleOAuthRoutes(
  app:FastifyInstance,
){


  const controller =
    new GoogleOAuthController(
      app,
    );



  app.get(
    "/google/oauth/url",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.getAuthorizationUrl,
  );



  app.get(
    "/google/oauth/callback",
    {},
    controller.callback,
  );


}
