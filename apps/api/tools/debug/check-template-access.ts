import {
  google,
} from "googleapis";

import {
  GoogleTokenService,
} from "../../src/modules/google/token/google-token.service.js";

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


const workspaceId =
  "cmrpedr090001pbt72bmapjzu";


const tokenService =
  new GoogleTokenService(
    {
      prisma,
    } as any,
  );


const token =
  await tokenService.getValidAccessToken(
    workspaceId,
  );


const auth =
  new google.auth.OAuth2();


auth.setCredentials({
  access_token:
    token,
});


const drive =
  google.drive({
    version:"v3",
    auth,
  });


const result =
  await drive.files.get({

    fileId:
      "1cwwVOaoWZqqjdIdhLKUG1qESY542pi-QngevvDR2yw4",

    fields:
      "id,name,owners(emailAddress,displayName)",

  });


console.log(
  result.data,
);


await prisma.$disconnect();
