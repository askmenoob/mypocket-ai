import dotenv from "dotenv";
import Fastify from "fastify";
import jwtPlugin from "@fastify/jwt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";


dotenv.config({
  path:"/opt/imai/.env",
});


const email =
  process.argv[2];


if (!email) {

  throw new Error(
    "Usage: generate-user-jwt.ts <email>",
  );

}


const adapter =
  new PrismaPg({
    connectionString:
      process.env.DATABASE_URL!,
  });


const prisma =
  new PrismaClient({
    adapter,
  });


const user =
  await prisma.user.findUnique({
    where:{
      email,
    },
  });


if (!user) {

  throw new Error(
    "USER_NOT_FOUND",
  );

}


const app =
  Fastify();


await app.register(
  jwtPlugin,
  {
    secret:
      process.env.JWT_SECRET!,
  },
);


const membership =
  await prisma.workspaceMember.findFirst({

    where:{
      userId:
        user.id,
    },

  });


if (!membership) {

  throw new Error(
    "MEMBERSHIP_NOT_FOUND",
  );

}


const token =
  await app.jwt.sign({

    userId:
      user.id,

    email:
      user.email,

    workspaceId:
      membership.workspaceId,

  });


console.log(
  JSON.stringify(
    {
      email,
      role:
        membership.role,
      token,
    },
    null,
    2,
  ),
);


await prisma.$disconnect();
await app.close();
