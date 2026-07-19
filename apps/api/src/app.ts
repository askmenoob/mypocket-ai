import Fastify from "fastify";

import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import errorHandler from "./plugins/error-handler.js";

import { healthRoutes } from "./routes/health.js";
import authModule from "./modules/auth/index.js";
import workspaceModule from "./modules/workspace/index.js";
import memberModule from "./modules/member/index.js";
import transactionModule from "./modules/transaction/index.js";
import googleModule from "./modules/google/index.js";


export function buildApp() {

  const app = Fastify({
    logger: true,
  });


  app.register(errorHandler);

  app.register(prismaPlugin);

  app.register(jwtPlugin);


  app.register(
    healthRoutes,
  );


  app.register(
    authModule,
    {
      prefix: "/api/v1",
    },
  );


  app.register(
    workspaceModule,
    {
      prefix: "/api/v1",
    },
  );


  app.register(
    memberModule,
    {
      prefix: "/api/v1",
    },
  );


  app.register(
    transactionModule,
  );


  app.register(
    googleModule,
    {
      prefix: "/api/v1",
    },
  );


  return app;
}
