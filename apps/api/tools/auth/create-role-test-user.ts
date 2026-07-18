import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";

dotenv.config({
  path:"/opt/imai/.env",
});


const adapter =
  new PrismaPg({
    connectionString:
      process.env.DATABASE_URL!,
  });


const prisma =
  new PrismaClient({
    adapter,
  });



const email =
  process.argv[2];


const role =
  process.argv[3];


if (!email || !role) {

  throw new Error(
    "Usage: create-role-test-user.ts <email> <role>",
  );

}



const allowedRoles = [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
];


if (
  !allowedRoles.includes(role)
) {

  throw new Error(
    "INVALID_ROLE",
  );

}



const workspace =
  await prisma.workspace.findFirst({

    where:{
      name:"ABE NIK Workspace",
    },

  });



if (!workspace) {

  throw new Error(
    "WORKSPACE_NOT_FOUND",
  );

}



let user =
  await prisma.user.findUnique({

    where:{
      email,
    },

  });



if (!user) {

  user =
    await prisma.user.create({

      data:{
        email,
        name:
          `Test ${role}`,
      },

    });

}



const existing =
  await prisma.workspaceMember.findFirst({

    where:{
      workspaceId:
        workspace.id,

      userId:
        user.id,

    },

  });



if (existing) {

  console.log(
    JSON.stringify(
      {
        message:
          "Membership already exists",
        user,
        membership:
          existing,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();

  process.exit(0);

}



const membership =
  await prisma.workspaceMember.create({

    data:{
      workspaceId:
        workspace.id,

      userId:
        user.id,

      role:
        role as any,

    },

    include:{
      user:true,
    },

  });



console.log(
  JSON.stringify(
    {
      user,
      workspaceId:
        workspace.id,
      role,
      membership,
    },
    null,
    2,
  ),
);



await prisma.$disconnect();
