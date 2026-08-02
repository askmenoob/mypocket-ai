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


    app.patch(
      "/name",
      controller.updateName,
    );



    app.get(
      "/admin/users",
      controller.adminListUsers,
    );


    app.post(
      "/invites",
      controller.createInvite,
    );


    app.post(
      "/invites/accept",
      controller.acceptInvite,
    );


    app.patch(
      "/admin/users/:userId/package",
      controller.adminUpdateUserPackage,
    );


    app.post(
      "/admin/users/:userId/google-sheet/upgrade",
      controller.adminUpgradeUserGoogleSheet,
    );


    app.post(
      "/admin/users/:userId/whatsapp/disconnect",
      controller.adminDisconnectUserWhatsApp,
    );


    app.post(
      "/admin/users/:userId/ban",
      controller.adminBanUser,
    );


    app.post(
      "/admin/users/:userId/unban",
      controller.adminUnbanUser,
    );


    app.post(
      "/admin/users/:userId/deactivate",
      controller.adminDeactivateUser,
    );


    app.post(
      "/admin/users/:userId/reactivate",
      controller.adminReactivateUser,
    );


    app.post(
      "/admin/users/:userId/delete",
      controller.adminDeleteUser,
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
