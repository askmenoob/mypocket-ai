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





const templates = [

  {

    type:
      "PERSONAL" as const,

    name:
      "MyPocket Personal Template",

    spreadsheetId:
      process.env.PERSONAL_TEMPLATE_ID
      ?? "",

    version:
      "1.0",

  },


  {

    type:
      "FAMILY" as const,

    name:
      "MyPocket Family Template",

    spreadsheetId:
      process.env.FAMILY_TEMPLATE_ID
      ?? "",

    version:
      "1.0",

  },


  {

    type:
      "BUSINESS" as const,

    name:
      "MyPocket Business Template",

    spreadsheetId:
      process.env.BUSINESS_TEMPLATE_ID
      ?? "",

    version:
      "1.0",

  },

];






for (const template of templates) {


  if(!template.spreadsheetId){

    console.log(
      `SKIP ${template.type}: missing spreadsheet ID`
    );

    continue;

  }



  await prisma.googleTemplate.upsert({

    where:{

      type_version:{

        type:
          template.type,

        version:
          template.version,

      },

    },


    update:{

      name:
        template.name,

      spreadsheetId:
        template.spreadsheetId,

      active:
        true,

    },


    create:{

      type:
        template.type,

      name:
        template.name,

      spreadsheetId:
        template.spreadsheetId,

      version:
        template.version,

      active:
        true,

    },

  });



  console.log(
    `SEEDED ${template.type}`
  );


}




await prisma.$disconnect();
