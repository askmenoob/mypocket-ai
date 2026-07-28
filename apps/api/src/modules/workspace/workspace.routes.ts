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


    app.get(
      "/all",
      controller.list,
    );


    app.get(
      "/admin/users",
      controller.adminListUsers,
    );


    app.patch(
      "/admin/users/:userId/package",
      controller.adminUpdateUserPackage,
    );


    app.post(
      "/",
      controller.create,
    );


    app.post(
      "/:id/switch",
      controller.switch,
    );

};


export default workspaceRoutes;
