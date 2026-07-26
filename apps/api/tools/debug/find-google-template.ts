import {
  PrismaClient,
} from "../../src/generated/prisma/client.js";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  env,
} from "../../src/config/index.js";


const adapter =
  new PrismaPg({
    connectionString:
      env.DATABASE_URL,
  });


const prisma =
  new PrismaClient({
    adapter,
  });


const templates =
  await prisma.googleTemplate.findMany({

    orderBy:{
      type:"asc",
    },

  });


console.log(
  JSON.stringify(
    templates,
    null,
    2,
  ),
);


await prisma.$disconnect();
