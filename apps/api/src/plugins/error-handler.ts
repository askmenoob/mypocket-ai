import fp from "fastify-plugin";

export default fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode ?? 500;

    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.name ?? "INTERNAL_ERROR",
        message:
          statusCode >= 500
            ? "Internal server error"
            : error.message,
      },
    });
  });
});
