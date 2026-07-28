import { FastifyInstance } from "fastify";

import { env } from "../config/index.js";

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

  app.get("/ready", async (_request, reply) => {
    const checks = {
      api: {
        status: "ok",
      },

      database: {
        status: "checking",
      },

      evolution: {
        status: "skipped",
      },
    };

    let ready = true;

    try {
      await app.prisma.$queryRaw`SELECT 1`;

      checks.database = {
        status: "ok",
      };
    } catch {
      ready = false;

      checks.database = {
        status: "error",
      };
    }

    if (env.EVOLUTION_API_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          3000,
        );

        const response = await fetch(
          env.EVOLUTION_API_URL,
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        clearTimeout(timeout);

        const reachable =
          response.status < 500;

        checks.evolution = {
          status:
            reachable
              ?
              "ok"
              :
              "error",
        };

        if (!reachable) {
          ready = false;
        }
      } catch {
        ready = false;

        checks.evolution = {
          status: "error",
        };
      }
    }

    const payload = {
      ...healthPayload(),
      status:
        ready
          ?
          "ready"
          :
          "not_ready",
      checks,
    };

    return reply
      .code(
        ready
          ?
          200
          :
          503,
      )
      .send(
        payload,
      );
  });
}
