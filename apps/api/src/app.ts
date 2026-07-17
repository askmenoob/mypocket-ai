import Fastify from "fastify";

import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import errorHandler from "./plugins/error-handler.js";

import { healthRoutes } from "./routes/health.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(errorHandler);

  app.register(prismaPlugin);

  app.register(jwtPlugin);

  app.register(healthRoutes);

  return app;
}
