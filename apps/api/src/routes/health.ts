import { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "imai-api",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });
}
