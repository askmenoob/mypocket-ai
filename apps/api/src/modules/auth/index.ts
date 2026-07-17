import type { FastifyPluginAsync } from "fastify";
import authRoutes from "./auth.routes.js";

const authModule: FastifyPluginAsync = async (app) => {

  await app.register(
    authRoutes,
    {
      prefix: "/auth",
    },
  );

};

export default authModule;
