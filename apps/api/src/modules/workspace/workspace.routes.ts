import type {
  FastifyPluginAsync,
} from "fastify";

import {
  WorkspaceController,
} from "./workspace.controller.js";


const workspaceRoutes:
  FastifyPluginAsync = async (
    app,
  ) => {


    const controller =
      new WorkspaceController(
        app,
      );


    app.get(
      "/me",
      controller.me,
    );

};


export default workspaceRoutes;
