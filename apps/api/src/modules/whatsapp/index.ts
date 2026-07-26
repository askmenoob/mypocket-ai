import type {
  FastifyPluginAsync,
} from "fastify";


import whatsappRoutes from "./whatsapp.routes.js";



const whatsappModule:FastifyPluginAsync =
async (
  app,
) => {

  await app.register(
    whatsappRoutes,
  );

};



export default whatsappModule;
