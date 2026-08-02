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
    "/url",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.getAuthorizationUrl,
  );



  app.get(
    "/callback",
    {},
    controller.callback,
  );



  /*
   * Backward compatibility untuk redirect URI lama:
   * /api/v1/google/oauth/google/oauth/callback
   */
  app.get(
    "/google/oauth/callback",
    async (
      request,
      reply,
    ) => {
      const query =
        request.raw.url
          ?.split("?")[1]
        ??
        "";

      const target =
        `/api/v1/google/oauth/callback${
          query
            ? `?${query}`
            : ""
        }`;

      return reply.redirect(
        target,
      );
    },
  );

}
