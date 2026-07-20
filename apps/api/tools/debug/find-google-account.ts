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



const accounts =
  await prisma.googleAccount.findMany({

    orderBy:{
      createdAt:
        "desc",
    },

  });



console.log(
  JSON.stringify(
    accounts.map(
      (account)=>({

        id:
          account.id,

        email:
          account.email,

        status:
          account.status,

        scopes:
          account.scopes,

        workspaceId:
          account.workspaceId,

        connectedAt:
          account.connectedAt,

      }),
    ),
    null,
    2,
  ),
);



await prisma.$disconnect();
