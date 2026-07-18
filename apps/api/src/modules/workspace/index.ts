import type {
  FastifyPluginAsync,
} from "fastify";

import workspaceRoutes from "./workspace.routes.js";


const workspaceModule:
  FastifyPluginAsync = async (
    app,
  ) => {


    await app.register(
      workspaceRoutes,
      {
        prefix:
          "/workspace",
      },
    );

};


export default workspaceModule;
