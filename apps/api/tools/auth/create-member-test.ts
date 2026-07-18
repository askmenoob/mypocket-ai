import dotenv from "dotenv";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";


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
  await prisma.user.upsert({

    where:{
      email:"member@test.com",
    },

    update:{},

    create:{
      email:"member@test.com",
      name:"Test Member",
    },

  });


console.log(
 JSON.stringify(
  user,
  null,
  2,
 )
);


await prisma.$disconnect();
