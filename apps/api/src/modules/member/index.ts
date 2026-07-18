import type {
  FastifyPluginAsync,
} from "fastify";

import memberRoutes from "./member.routes.js";


const memberModule:
  FastifyPluginAsync = async (
    app,
  ) => {


    await app.register(
      memberRoutes,
      {
        prefix:
          "/workspace",
      },
    );


};


export default memberModule;
