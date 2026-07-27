import type { FastifyPluginAsync } from "fastify";
import { AuthController } from "./auth.controller.js";

const authRoutes: FastifyPluginAsync = async (app) => {

  const controller =
    new AuthController(app);


  app.get(
    "/google",
    controller.googleLogin,
  );


  app.get(
    "/google/callback",
    controller.googleCallback,
  );


  app.get(
    "/me",
    controller.me,
  );


  app.post(
    "/onboarding/complete",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.completeOnboarding,
  );
};


export default authRoutes;
