import type { PrismaClient } from "../generated/prisma/client.js";
import type { FastifyJWT } from "@fastify/jwt";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
    };
  }
}
