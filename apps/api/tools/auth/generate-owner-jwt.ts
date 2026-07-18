import dotenv from "dotenv";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import Fastify from "fastify";
import jwtPlugin from "@fastify/jwt";


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



const user =
  await prisma.user.findUnique({

    where:{
      email:"pillo0404@gmail.com",
    },

  });



if (!user) {

  throw new Error(
    "OWNER_USER_NOT_FOUND",
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



const token =
  await app.jwt.sign({

    userId:
      user.id,

    email:
      user.email,

    workspaceId:
      "cmrpedr090001pbt72bmapjzu",

  });



console.log(
 JSON.stringify(
  {
    token,
  },
  null,
  2,
 )
);



await prisma.$disconnect();
await app.close();
