import Fastify from "fastify";
import cors from "@fastify/cors";

import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import errorHandler from "./plugins/error-handler.js";

import { healthRoutes } from "./routes/health.js";
import authModule from "./modules/auth/index.js";
import workspaceModule from "./modules/workspace/index.js";
import memberModule from "./modules/member/index.js";
import transactionModule from "./modules/transaction/index.js";
import whatsappModule from "./modules/whatsapp/index.js";
import googleModule from "./modules/google/index.js";
import billingModule from "./modules/billing/index.js";
import commitmentModule from "./modules/commitment/index.js";


export function buildApp() {

  const app = Fastify({
    logger: true,
  });


  app.register(errorHandler);

  app.register(cors, {
    origin: [
      "https://app.imai.my",
      "https://imai.my",
      "https://api.imai.my",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
    methods: [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    credentials: true,
  });

  app.register(prismaPlugin);

  app.register(jwtPlugin);


  app.get(
    "/",
    async (_request, reply) => reply.redirect(
      "https://app.imai.my",
    ),
  );


  app.register(
    healthRoutes,
    {
      prefix: "/api/v1",
    },
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
    {
      prefix: "/api/v1",
    },
  );


  app.register(
    whatsappModule,
    {
      prefix: "/api/v1",
    },
  );


  app.register(
    googleModule,
    {
      prefix: "/api/v1",
    },
  );


  app.register(
    commitmentModule,
    {
      prefix: "/api/v1",
    },
  );


  app.register(
    billingModule,
    {
      prefix: "/api/v1",
    },
  );


  return app;
}
