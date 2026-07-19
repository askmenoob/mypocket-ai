import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";


import {
  GoogleService,
} from "./google.service.js";


import {
  connectGoogleSchema,
} from "./google.schemas.js";



export class GoogleController {


  private readonly service:
    GoogleService;



  constructor(
    app:FastifyInstance,
  ){

    this.service =
      new GoogleService(
        app,
      );

  }





  getStatus =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;


    request.log.info({
      googleUserContext:user,
    },
    "GOOGLE DEBUG USER CONTEXT");


    const result =
      await this.service
        .getStatus(
          user.workspaceId,
        );


    return reply.send(
      result,
    );

  }





  connect =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;


    const body =
      connectGoogleSchema
        .parse(
          request.body,
        );


    const result =
      await this.service
        .connect(
          user.role,

          user.workspaceId,

          body.email,

          body.accessToken,

          body.refreshToken ?? null,

          body.expiresAt
            ? new Date(body.expiresAt)
            : null,

          body.scopes ?? null,
        );


    return reply
      .code(201)
      .send(
        result,
      );

  }





  disconnect =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;


    const result =
      await this.service
        .disconnect(
          user.role,

          user.workspaceId,
        );


    return reply.send(
      result,
    );

  };


}
