import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";


import {
  GoogleOAuthService,
} from "./google.oauth.service.js";


import {
  googleOAuthCallbackSchema,
} from "./google.oauth.schemas.js";



export class GoogleOAuthController {


  private readonly service:
    GoogleOAuthService;



  constructor(
    app:FastifyInstance,
  ){

    this.service =
      new GoogleOAuthService(
        app,
      );

  }



  getAuthorizationUrl =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const user =
      request.user as any;


    const state =
      user.workspaceId;


    const url =
      this.service
        .generateAuthorizationUrl(
          state,
        );


    return reply.send({
      url,
    });

  };




  callback =
  async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {


    const query =
      googleOAuthCallbackSchema
        .parse(
          request.query,
        );


    const account =
      await this.service
        .connectWorkspaceGoogleAccount(
          query.state,
          query.code,
        );


    return reply.send({

      message:
        "Google Workspace connected successfully",


      workspaceId:
        query.state,


      googleAccountId:
        account.id,


      status:
        account.status,

    });

  };


}
