import type {
  PrismaClient,
} from "../generated/prisma/client.js";


declare module "fastify" {


  interface FastifyInstance {

    prisma:
      PrismaClient;


    authenticate:
      (
        request:any,
        reply:any,
      ) => Promise<void>;

  }


}
