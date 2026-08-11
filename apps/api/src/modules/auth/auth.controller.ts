import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";

import { env } from "../../config/index.js";
import {
  resolveDashboardUrl,
} from "../../config/dashboard-url.js";
import { AuthService } from "./auth.service.js";
import {
  GoogleService as GoogleAuthService,
} from "./google.service.js";
import {
  clearOAuthCookie,
  createOAuthFlow,
  oauthValuesMatch,
  readCookie,
  serializeOAuthCookie,
} from "../../shared/auth/oauth-flow.security.js";
import {
  AppError,
} from "../../shared/errors/index.js";


const GOOGLE_AUTH_STATE_COOKIE =
  "__Host-imai_google_auth_state";
const GOOGLE_AUTH_VERIFIER_COOKIE =
  "__Host-imai_google_auth_verifier";


export class AuthController {

  private readonly service: AuthService;
  private readonly google: GoogleAuthService;


  constructor(
    private readonly app: FastifyInstance,
  ) {

    this.service =
      new AuthService(app);

    this.google =
      new GoogleAuthService();

  }



  googleLogin = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ) => {

    const flow =
      createOAuthFlow();

    reply.header(
      "Set-Cookie",
      [
        serializeOAuthCookie(
          GOOGLE_AUTH_STATE_COOKIE,
          flow.state,
        ),
        serializeOAuthCookie(
          GOOGLE_AUTH_VERIFIER_COOKIE,
          flow.verifier,
        ),
      ],
    );

    const url =
      this.service.getGoogleLoginUrl(
        flow.state,
        flow.challenge,
      );


    return reply.redirect(url);

  };



  googleCallback = async (
    request: FastifyRequest<{
      Querystring: {
        code?: string;
        mode?: string;
        state?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {


    const code =
      request.query.code;

    const expectedState =
      readCookie(
        request.headers.cookie,
        GOOGLE_AUTH_STATE_COOKIE,
      );

    const codeVerifier =
      readCookie(
        request.headers.cookie,
        GOOGLE_AUTH_VERIFIER_COOKIE,
      );

    reply.header(
      "Set-Cookie",
      [
        clearOAuthCookie(
          GOOGLE_AUTH_STATE_COOKIE,
        ),
        clearOAuthCookie(
          GOOGLE_AUTH_VERIFIER_COOKIE,
        ),
      ],
    );


    if (!code) {

      throw new AppError(
        "GOOGLE_AUTH_CODE_MISSING",
        "Google did not return an authorization code.",
        400,
      );

    }


    if(
      !codeVerifier
      ||
      !oauthValuesMatch(
        expectedState,
        request.query.state,
      )
    ){
      throw new AppError(
        "GOOGLE_AUTH_FLOW_INVALID",
        "Google sign-in expired or could not be verified. Please start again from MyPocket AI.",
        400,
      );
    }



    const tokens =
      await this.google.exchangeCode(
        code,
        codeVerifier,
      );



    const profile =
      await this.google.getProfile(
        tokens.access_token,
      );



    const session =
      await this.service.loginWithGoogle(
      profile,
    );

    if(request.query.mode === "json"){
      return session;
    }


    const appUrl =
      resolveDashboardUrl(
        env.APP_URL,
      );

    const redirectUrl =
      new URL(
        appUrl,
      );

    const redirectParams =
      new URLSearchParams({
        auth:
          "google",

        token:
          session.token,

        next:
          "google",
      });

    redirectParams.set(
      "message",
      "Google sign-in successful. Connect Google Sheets in the next step when you are ready.",
    );


    redirectUrl.hash =
      redirectParams.toString();


    return reply.redirect(
      redirectUrl.toString(),
    );

  };


  me = async (
    request: FastifyRequest,
  ) => {

    await request.jwtVerify();


    return this.service
      .getCurrentSession(
        request.user.userId,
        request.user.workspaceId,
      );

  };



  completeOnboarding = async (
    request:FastifyRequest,
  ) => {

    await request.jwtVerify();


    return this.service
      .completeOnboarding(
        request.user.userId,
        request.user.workspaceId,
      );

  };

}
