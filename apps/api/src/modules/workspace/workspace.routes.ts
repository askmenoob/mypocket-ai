import type {
  FastifyPluginAsync,
} from "fastify";

import {
  WorkspaceController,
} from "./workspace.controller.js";

import {
  requireRole,
  Roles,
} from "../../shared/auth/index.js";


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
      { preHandler:[app.authenticate] },
      controller.me,
    );


    app.get(
      "/all",
      { preHandler:[app.authenticate] },
      controller.list,
    );


    app.patch(
      "/name",
      { preHandler:[requireRole(Roles.OWNER, Roles.ADMIN)] },
      controller.updateName,
    );



    app.get(
      "/admin/users",
      { preHandler:[app.authenticate] },
      controller.adminListUsers,
    );


    app.post(
      "/invites",
      { preHandler:[requireRole(Roles.OWNER, Roles.ADMIN)] },
      controller.createInvite,
    );


    app.post(
      "/invites/accept",
      { preHandler:[app.authenticate] },
      controller.acceptInvite,
    );


    app.patch(
      "/admin/users/:userId/package",
      { preHandler:[app.authenticate] },
      controller.adminUpdateUserPackage,
    );


    app.post(
      "/admin/users/:userId/google-sheet/upgrade",
      { preHandler:[app.authenticate] },
      controller.adminUpgradeUserGoogleSheet,
    );


    app.post(
      "/admin/users/:userId/whatsapp/disconnect",
      { preHandler:[app.authenticate] },
      controller.adminDisconnectUserWhatsApp,
    );


    app.post(
      "/admin/users/:userId/ban",
      { preHandler:[app.authenticate] },
      controller.adminBanUser,
    );


    app.post(
      "/admin/users/:userId/unban",
      { preHandler:[app.authenticate] },
      controller.adminUnbanUser,
    );


    app.post(
      "/admin/users/:userId/deactivate",
      { preHandler:[app.authenticate] },
      controller.adminDeactivateUser,
    );


    app.post(
      "/admin/users/:userId/reactivate",
      { preHandler:[app.authenticate] },
      controller.adminReactivateUser,
    );


    app.post(
      "/admin/users/:userId/delete",
      { preHandler:[app.authenticate] },
      controller.adminDeleteUser,
    );


    app.post(
      "/",
      { preHandler:[app.authenticate] },
      controller.create,
    );


    app.post(
      "/:id/switch",
      { preHandler:[app.authenticate] },
      controller.switch,
    );

};


export default workspaceRoutes;
