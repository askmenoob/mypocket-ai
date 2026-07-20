import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../src/config/index.js";


const adapter =
  new PrismaPg({
    connectionString:
      env.DATABASE_URL,
  });


const prisma =
  new PrismaClient({
    adapter,
  });


const account =
  await prisma.googleAccount.findUnique({
    where:{
      workspaceId:
        "cmrpedr090001pbt72bmapjzu",
    },
  });


if(!account){

  console.log("No Google Account found");
  process.exit(0);

}


console.log({

  accessTokenLength:
    account.accessToken?.length,

  accessTokenPrefix:
    account.accessToken?.split(":").length === 3
      ? "ENCRYPTED_FORMAT"
      : "UNKNOWN_FORMAT",


  refreshTokenLength:
    account.refreshToken?.length,

  refreshTokenPrefix:
    account.refreshToken?.split(":").length === 3
      ? "ENCRYPTED_FORMAT"
      : "UNKNOWN_FORMAT",

});


await prisma.$disconnect();
