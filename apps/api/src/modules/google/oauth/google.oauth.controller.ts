import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";


import {
  GoogleOAuthService,
} from "./google.oauth.service.js";


import {
  env,
} from "../../../config/index.js";


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


    if(!query.state){

      return this.redirectToAppWithError(
        reply,
        "GOOGLE_OAUTH_STATE_MISSING",
        "Google setup perlu dimulakan dari dashboard MyPocket.",
      );

    }


    try{

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

    }catch(error){

      const err =
        error as {
          name?:string;
          message?:string;
        };


      return this.redirectToAppWithError(
        reply,
        err.name
        ??
        "GOOGLE_WORKSPACE_CONNECT_FAILED",
        err.message
        ??
        "Google Workspace connection failed.",
      );

    }

  };



  private redirectToAppWithError(
    reply:FastifyReply,
    code:string,
    message:string,
  ){

    const appUrl =
      env.APP_URL
      ??
      "https://app.imai.my";


    const redirectUrl =
      new URL(
        appUrl,
      );


    redirectUrl.hash =
      new URLSearchParams({
        google:
          "error",

        code,

        message,
      }).toString();


    return reply.redirect(
      redirectUrl.toString(),
    );

  }


}
