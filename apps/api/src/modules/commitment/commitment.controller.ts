import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  botSettingsSchema,
  commitmentFilterSchema,
  createCommitmentSchema,
  updateCommitmentSchema,
} from "./commitment.schemas.js";

import {
  CommitmentService,
} from "./commitment.service.js";

export class CommitmentController {

  private readonly service:CommitmentService;

  constructor(
    app:FastifyInstance,
  ){
    this.service =
      new CommitmentService(
        app,
      );
  }

  list =
  async (
    request:FastifyRequest,
  ) => {
    const user =
      request.user as any;

    const query =
      commitmentFilterSchema.parse(
        request.query,
      );

    return this.service.listCommitments(
      {
        userId:user.userId,
        email:user.email,
        workspaceId:user.workspaceId,
        role:user.role,
      },
      query.status,
    );
  };

  create =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {
    const user =
      request.user as any;

    const body =
      createCommitmentSchema.parse(
        request.body,
      );

    const result =
      await this.service.createCommitment(
        {
          userId:user.userId,
          email:user.email,
          workspaceId:user.workspaceId,
          role:user.role,
        },
        body,
      );

    return reply
      .code(201)
      .send(
        result,
      );
  };

  update =
  async (
    request:FastifyRequest,
  ) => {
    const user =
      request.user as any;

    const params =
      request.params as {
        id:string;
      };

    const body =
      updateCommitmentSchema.parse(
        request.body,
      );

    return this.service.updateCommitment(
      {
        userId:user.userId,
        email:user.email,
        workspaceId:user.workspaceId,
        role:user.role,
      },
      params.id,
      body,
    );
  };

  archive =
  async (
    request:FastifyRequest,
  ) => {
    const user =
      request.user as any;

    const params =
      request.params as {
        id:string;
      };

    return this.service.archiveCommitment(
      {
        userId:user.userId,
        email:user.email,
        workspaceId:user.workspaceId,
        role:user.role,
      },
      params.id,
    );
  };

  markPaid =
  async (
    request:FastifyRequest,
  ) => {
    const user =
      request.user as any;

    const params =
      request.params as {
        id:string;
      };

    return this.service.markCurrentMonthPaid(
      {
        userId:user.userId,
        email:user.email,
        workspaceId:user.workspaceId,
        role:user.role,
      },
      params.id,
    );
  };

  getBotSettings =
  async (
    request:FastifyRequest,
  ) => {
    const user =
      request.user as any;

    return this.service.getBotSettings({
      userId:user.userId,
      email:user.email,
      workspaceId:user.workspaceId,
      role:user.role,
    });
  };

  updateBotSettings =
  async (
    request:FastifyRequest,
  ) => {
    const user =
      request.user as any;

    const body =
      botSettingsSchema.parse(
        request.body,
      );

    return this.service.updateBotSettings(
      {
        userId:user.userId,
        email:user.email,
        workspaceId:user.workspaceId,
        role:user.role,
      },
      body,
    );
  };

}
