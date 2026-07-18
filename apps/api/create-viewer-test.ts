import { PrismaClient } from "./src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";


dotenv.config({
  path: "../../.env",
});


const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL!,
});


const prisma = new PrismaClient({
  adapter,
});


async function main() {


  const workspace =
    await prisma.workspace.findFirst({

      where:{
        name:
          "ABE NIK Workspace",
      },

    });



  if (!workspace) {

    throw new Error(
      "WORKSPACE_NOT_FOUND",
    );

  }



  const user =
    await prisma.user.upsert({

      where:{
        email:
          "viewer@test.com",
      },


      update:{},


      create:{
        email:
          "viewer@test.com",

        name:
          "Test Viewer",
      },

    });



  const membership =
    await prisma.workspaceMember.upsert({

      where:{
        userId_workspaceId:{
          userId:
            user.id,

          workspaceId:
            workspace.id,
        },
      },


      update:{
        role:
          "VIEWER",
      },


      create:{
        userId:
          user.id,

        workspaceId:
          workspace.id,

        role:
          "VIEWER",
      },

    });



  console.log(
    JSON.stringify(
      {
        user,
        membership,
      },
      null,
      2,
    ),
  );


}


main()
.finally(
  async () => {

    await prisma.$disconnect();

  },
);
