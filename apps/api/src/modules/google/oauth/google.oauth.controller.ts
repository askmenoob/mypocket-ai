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
  resolveDashboardUrl,
} from "../../../config/dashboard-url.js";


import {
  GoogleSettingsService,
} from "../settings/google-settings.service.js";


import {
  googleOAuthCallbackSchema,
} from "./google.oauth.schemas.js";
import {
  clearOAuthCookie,
  createOAuthFlow,
  oauthValuesMatch,
  readCookie,
  serializeOAuthCookie,
} from "../../../shared/auth/oauth-flow.security.js";


const GOOGLE_WORKSPACE_STATE_COOKIE =
  "__Host-imai_google_workspace_state";
const GOOGLE_WORKSPACE_VERIFIER_COOKIE =
  "__Host-imai_google_workspace_verifier";


type GoogleWorkspaceState = {
  purpose:string;
  workspaceId:string;
  userId:string;
  nonce:string;
};



export class GoogleOAuthController {


  private readonly service:
    GoogleOAuthService;


  private readonly settingsService:
    GoogleSettingsService;



  constructor(
    private readonly app:FastifyInstance,
  ){

    this.service =
      new GoogleOAuthService(
        app,
      );


    this.settingsService =
      new GoogleSettingsService(
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


    const flow =
      createOAuthFlow();

    const state =
      this.app.jwt.sign(
        {
          purpose:
            "google-workspace-oauth",
          workspaceId:
            user.workspaceId,
          userId:
            user.userId,
          nonce:
            flow.state,
        },
        {
          expiresIn:
            "10m",
        },
      );

    reply.header(
      "Set-Cookie",
      [
        serializeOAuthCookie(
          GOOGLE_WORKSPACE_STATE_COOKIE,
          state,
        ),
        serializeOAuthCookie(
          GOOGLE_WORKSPACE_VERIFIER_COOKIE,
          flow.verifier,
        ),
      ],
    );


    const url =
      this.service
        .generateAuthorizationUrl(
          state,
          flow.challenge,
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


    const expectedState =
      readCookie(
        request.headers.cookie,
        GOOGLE_WORKSPACE_STATE_COOKIE,
      );

    const codeVerifier =
      readCookie(
        request.headers.cookie,
        GOOGLE_WORKSPACE_VERIFIER_COOKIE,
      );

    reply.header(
      "Set-Cookie",
      [
        clearOAuthCookie(
          GOOGLE_WORKSPACE_STATE_COOKIE,
        ),
        clearOAuthCookie(
          GOOGLE_WORKSPACE_VERIFIER_COOKIE,
        ),
      ],
    );


    if(
      !query.state
      ||
      !codeVerifier
      ||
      !oauthValuesMatch(
        expectedState,
        query.state,
      )
    ){

      return this.redirectToAppWithError(
        reply,
        "GOOGLE_OAUTH_STATE_MISSING",
        "Google setup perlu dimulakan dari dashboard MyPocket.",
      );

    }


    try{

    const oauthState =
      this.app.jwt.verify<GoogleWorkspaceState>(
        query.state,
      );


    if(
      oauthState.purpose
      !==
      "google-workspace-oauth"
      ||
      !oauthState.workspaceId
      ||
      !oauthState.userId
      ||
      !oauthState.nonce
    ){
      throw new Error(
        "GOOGLE_OAUTH_STATE_INVALID",
      );
    }

    const workspaceId =
      oauthState.workspaceId;

    const account =
      await this.service
        .connectWorkspaceGoogleAccount(
          workspaceId,
          query.code,
          codeVerifier,
        );

    const existingSettings =
      await this.settingsService
        .getSettings(
          workspaceId,
        );


    const settings =
      existingSettings
      ??
      await this.settingsService
        .autoCreateSheet(
          workspaceId,
          "MyPocket Workspace Template",
          account.email,
        );


    return this.redirectToApp(
      reply,
      {
        google:
          "connected",

        setup:
          "google",

        next:
          "whatsapp",

        workspaceId:
          workspaceId,

        googleAccountId:
          account.id,

        spreadsheetId:
          settings.spreadsheetId,

        status:
          account.status,

        message:
          existingSettings
            ? "Google Workspace connected successfully."
            : "Google Sheet connected and template created successfully.",
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
      resolveDashboardUrl(
        env.APP_URL,
      );


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
