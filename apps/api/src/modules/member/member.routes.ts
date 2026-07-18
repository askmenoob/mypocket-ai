import type {
  FastifyPluginAsync,
} from "fastify";


import {
  MemberController,
} from "./member.controller.js";


import {
  requireRole,
  Roles,
} from "../../shared/auth/index.js";



const memberRoutes:
  FastifyPluginAsync = async (
    app,
  ) => {


    const controller =
      new MemberController(
        app,
      );



    app.get(
      "/members",
      {
        preHandler:
          requireRole(
            Roles.OWNER,
            Roles.ADMIN,
            Roles.MEMBER,
          ),
      },
      controller.list,
    );



    app.post(
      "/members",
      {
        preHandler:
          requireRole(
            Roles.OWNER,
            Roles.ADMIN,
          ),
      },
      controller.add,
    );



    app.patch<{
      Params:{
        id:string;
      };
    }>(
      "/members/:id/role",
      {
        preHandler:
          requireRole(
            Roles.OWNER,
            Roles.ADMIN,
          ),
      },
      controller.updateRole,
    );



    app.delete<{
      Params:{
        id:string;
      };
    }>(
      "/members/:id",
      {
        preHandler:
          requireRole(
            Roles.OWNER,
            Roles.ADMIN,
          ),
      },
      controller.remove,
    );


};



export default memberRoutes;
