import type { FastifyPluginAsync } from "fastify";

import promotionRoutes from "./promotion.routes.js";

const promotionModule:FastifyPluginAsync = async (app) => {
  await app.register(promotionRoutes, { prefix:"/promotion" });
};

export default promotionModule;
