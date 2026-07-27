import fp from "fastify-plugin";
import { ZodError } from "zod";

export default fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if(error instanceof ZodError){

      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          issues: error.issues.map((issue) => ({
            path:
              issue.path.join("."),

            message:
              issue.message,
          })),
        },
      });

    }

    const err = error as {
      statusCode?: number;
      name?: string;
      message?: string;
    };

    const statusCode = err.statusCode ?? 500;

    reply.status(statusCode).send({
      success: false,
      error: {
        code: err.name ?? "INTERNAL_ERROR",
        message:
          statusCode >= 500
            ? "Internal server error"
            : err.message,
      },
    });
  });
});
