import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../src/config/index.js";


async function main(){

  const adapter =
    new PrismaPg({
      connectionString:
        env.DATABASE_URL,
    });


  const prisma =
    new PrismaClient({
      adapter,
    });


  await prisma.$connect();


  const members =
    await prisma.workspaceMember.findMany({

      include:{
        user:true,
        workspace:true,
      },

    });


  console.log(
    JSON.stringify(
      members.map((m)=>({

        memberId:
          m.id,

        userId:
          m.userId,

        email:
          m.user.email,

        role:
          m.role,

        workspaceId:
          m.workspaceId,

      })),
      null,
      2,
    ),
  );


  await prisma.$disconnect();

}


main();
