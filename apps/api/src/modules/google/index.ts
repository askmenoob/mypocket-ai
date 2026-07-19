import type {
  FastifyPluginAsync,
} from "fastify";


import googleRoutes from "./google.routes.js";



const googleModule:
FastifyPluginAsync =
async (
  app,
) => {


  await app.register(
    googleRoutes,
    {
      prefix:
        "/workspace",
    },
  );


};


export default googleModule;
