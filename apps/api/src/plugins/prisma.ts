import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/index.js";
import { createPrismaPgOptions } from "./prisma-pg-tls-options.js";

export default fp(async (app) => {
  const adapter = new PrismaPg(createPrismaPgOptions(env.DATABASE_URL));

  const prisma = new PrismaClient({
    adapter,
  });

  await prisma.$connect();

  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
