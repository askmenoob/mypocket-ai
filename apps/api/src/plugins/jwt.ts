import fp from "fastify-plugin";

import fastifyJwt from "@fastify/jwt";

import { env } from "../config/index.js";



export default fp(async (app) => {


  await app.register(
    fastifyJwt,
    {
      secret: env.JWT_SECRET,
    },
  );



  app.decorate(
    "authenticate",
    async function(
      request:any,
    ){


      await request.jwtVerify();



      const payload =
        request.user;



      if (
        !payload.userId ||
        !payload.workspaceId
      ){

        throw new Error(
          "Invalid authentication context",
        );

      }



      const membership =
        await app.prisma.workspaceMember.findUnique({
          where:{
            userId_workspaceId:{
              userId:
                payload.userId,

              workspaceId:
                payload.workspaceId,
            },
          },
        });



      if(!membership){

        throw new Error(
          "Workspace membership not found",
        );

      }



      request.user = {

        ...payload,

        role:
          membership.role,

      };


    },
  );


});
