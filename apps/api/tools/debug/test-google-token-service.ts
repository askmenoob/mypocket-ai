import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { env } from "../../src/config/index.js";
import { GoogleTokenService } from "../../src/modules/google/token/google-token.service.js";


const adapter =
  new PrismaPg({
    connectionString:
      env.DATABASE_URL,
  });


const prisma =
  new PrismaClient({
    adapter,
  });


const fakeApp:any = {
  prisma,
};


const service =
  new GoogleTokenService(
    fakeApp,
  );


const token =
  await service.getAccessToken(
    "cmrpedr090001pbt72bmapjzu",
  );


console.log({

  decrypted:
    !!token,

  length:
    token.length,

  prefix:
    token.substring(
      0,
      6,
    ),

});


await prisma.$disconnect();
