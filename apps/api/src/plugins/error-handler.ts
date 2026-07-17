import fp from "fastify-plugin";

export default fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

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
