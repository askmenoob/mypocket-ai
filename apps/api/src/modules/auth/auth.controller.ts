import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";

import { env } from "../../config/index.js";
import { AuthService } from "./auth.service.js";
import { GoogleService } from "./google.service.js";


export class AuthController {

  private readonly service: AuthService;
  private readonly google: GoogleService;


  constructor(
    private readonly app: FastifyInstance,
  ) {

    this.service =
      new AuthService(app);

    this.google =
      new GoogleService();

  }



  googleLogin = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ) => {

    const url =
      this.service.getGoogleLoginUrl();


    return reply.redirect(url);

  };



  googleCallback = async (
    request: FastifyRequest<{
      Querystring: {
        code?: string;
        mode?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {


    const code =
      request.query.code;


    if (!code) {

      throw new Error(
        "Missing authorization code",
      );

    }



    const tokens =
      await this.google.exchangeCode(
        code,
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
      env.APP_URL
      ??
      "https://app.imai.my";

    const redirectUrl =
      new URL(
        appUrl,
      );

    redirectUrl.hash =
      new URLSearchParams({
        auth:
          "google",

        token:
          session.token,
      }).toString();


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
      );

  };

}
