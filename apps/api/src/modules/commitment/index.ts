import type {
  FastifyPluginAsync,
} from "fastify";

import commitmentRoutes from "./commitment.routes.js";

const commitmentModule:FastifyPluginAsync =
async (
  app,
) => {
  await app.register(
    commitmentRoutes,
  );
};

export default commitmentModule;
