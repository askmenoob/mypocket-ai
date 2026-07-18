import dotenv from "dotenv";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";


dotenv.config({
  path: "../../.env",
});


const app = Fastify();


await app.register(
  fastifyJwt,
  {
    secret:
      process.env.JWT_SECRET!,
  },
);



const token =
  await app.jwt.sign({

    userId:
      "cmrqahza900006tt7jkna40i5",

    email:
      "viewer@test.com",

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
  ),
);



await app.close();
