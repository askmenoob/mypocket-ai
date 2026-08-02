import type {
  FastifyInstance,
} from "fastify";

import {
  CommitmentController,
} from "./commitment.controller.js";

export default async function commitmentRoutes(
  app:FastifyInstance,
){
  const controller =
    new CommitmentController(
      app,
    );

  app.get(
    "/commitments",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.list,
  );

  app.post(
    "/commitments",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.create,
  );

  app.patch(
    "/commitments/:id",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.update,
  );

  app.post(
    "/commitments/:id/archive",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.archive,
  );

  app.post(
    "/commitments/:id/pay-current",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.markPaid,
  );

  app.get(
    "/bot-settings",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.getBotSettings,
  );

  app.patch(
    "/bot-settings",
    {
      preHandler:[
        app.authenticate,
      ],
    },
    controller.updateBotSettings,
  );
}
