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


    return this.redirectToApp(
      reply,
      {
        google:
          "connected",

        workspaceId:
          query.state,

        googleAccountId:
          account.id,

        status:
          account.status,

        message:
          "Google Workspace connected successfully.",
      },
    );

    }catch(error){

      const err =
        error as {
          name?:string;
          message?:string;
        };


      return this.redirectToApp(
        reply,
        {
          google:
            "error",

          code:
            err.name
            ??
            "GOOGLE_WORKSPACE_CONNECT_FAILED",

          message:
            err.message
            ??
            "Google Workspace connection failed.",
        },
      );

    }

  };



  private redirectToAppWithError(
    reply:FastifyReply,
    code:string,
    message:string,
  ){

    return this.redirectToApp(
      reply,
      {
        google:
          "error",

        code,

        message,
      },
    );

  }



  private redirectToApp(
    reply:FastifyReply,
    params:Record<string, string>,
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
      new URLSearchParams(
        params,
      ).toString();


    return reply.redirect(
      redirectUrl.toString(),
    );

  }


}
