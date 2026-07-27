import { FastifyInstance } from "fastify";

function healthPayload() {
  return {
    status: "ok",
    service: "imai-api",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

export async function healthRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      ...healthPayload(),
      message: "MyPocket API is running",
      health: "/api/v1/health",
      app: "https://app.imai.my",
    };
  });

  app.get("/health", async () => {
    return healthPayload();
  });
}
