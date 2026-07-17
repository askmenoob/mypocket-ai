import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

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
    _request,
    reply,
  ) => {

    const url =
      this.service.getGoogleLoginUrl();


    return reply.redirect(url);

  };



  googleCallback = async (
    request: FastifyRequest<{
      Querystring: {
        code?: string;
      };
    }>,
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



    return this.service.loginWithGoogle(
      profile,
    );

  };



  me = async (
    request: FastifyRequest,
  ) => {

    await request.jwtVerify();


    return {
      user:
        request.user,
    };

  };

}
