import type {
  FastifyPluginAsync,
} from "fastify";

import {
  MemberController,
} from "./member.controller.js";


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
      controller.list,
    );


};


export default memberRoutes;
