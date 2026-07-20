import type {
  FastifyPluginAsync,
} from "fastify";


import transactionRoutes from "./transaction.routes.js";



const transactionModule:
FastifyPluginAsync =
async (
  app,
) => {


  await app.register(
    transactionRoutes,
  );


};


export default transactionModule;
