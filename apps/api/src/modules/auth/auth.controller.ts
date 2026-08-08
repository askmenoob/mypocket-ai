import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";

import { env } from "../../config/index.js";
import { AuthService } from "./auth.service.js";
import {
  googleConfig,
} from "../../config/google.js";
import { GoogleService as GoogleAuthService } from "./google.service.js";
import {
  GoogleService as WorkspaceGoogleService,
} from "../google/google.service.js";
import {
  GoogleSettingsService,
} from "../google/settings/google-settings.service.js";
import {
  TokenEncryptionService,
} from "../google/crypto/token-encryption.service.js";
import type {
  AuthSession,
  GoogleProfile,
} from "./auth.types.js";


export class AuthController {

  private readonly service: AuthService;
  private readonly google: GoogleAuthService;
  private readonly workspaceGoogle: WorkspaceGoogleService;
  private readonly googleSettings: GoogleSettingsService;
  private readonly encryption: TokenEncryptionService;


  constructor(
    private readonly app: FastifyInstance,
  ) {

    this.service =
      new AuthService(app);

    this.google =
      new GoogleAuthService();

    this.workspaceGoogle =
      new WorkspaceGoogleService(
        app,
      );

    this.googleSettings =
      new GoogleSettingsService(
        app,
      );

    this.encryption =
      new TokenEncryptionService();

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

    const googleSetup =
      await this.completeGoogleSetup(
        session,
        profile,
        tokens,
      );


    if(request.query.mode === "json"){
      return {
        ...session,
        googleSetup,
      };
    }


    const appUrl =
      env.APP_URL
      ??
      "https://app.imai.my";

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
          googleSetup.connected
            ? "whatsapp"
            : "google",
      });


    if(googleSetup.connected){

      redirectParams.set(
        "google",
        "connected",
      );

      redirectParams.set(
        "message",
        googleSetup.createdSheet
          ? "Google login successful. Google Sheet template created."
          : "Google login successful. Google Sheet connected.",
      );

    }else{

      redirectParams.set(
        "google",
        "error",
      );

      redirectParams.set(
        "message",
        googleSetup.message,
      );

    }


    redirectUrl.hash =
      redirectParams.toString();


    return reply.redirect(
      redirectUrl.toString(),
    );

  };


  private async completeGoogleSetup(
    session:AuthSession,
    profile:GoogleProfile,
    tokens:{
      access_token:string;
      refresh_token?:string;
      expires_in?:number;
    },
  ){

    try{

      if(
        session.workspace.role !== "OWNER"
        &&
        session.workspace.role !== "ADMIN"
      ){

        return {
          connected:false,
          createdSheet:false,
          message:
            "Google Sheet setup hanya boleh dibuat oleh Owner/Admin workspace.",
        };

      }


      const expiresAt =
        tokens.expires_in
          ? new Date(
              Date.now()
              +
              tokens.expires_in * 1000,
            )
          : null;


      const encryptedAccessToken =
        this.encryption.encrypt(
          tokens.access_token,
        );


      const encryptedRefreshToken =
        tokens.refresh_token
          ? this.encryption.encrypt(
              tokens.refresh_token,
            )
          : null;


      await this.workspaceGoogle
        .connect(
          session.workspace.role,
          session.workspace.id,
          profile.email,
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          googleConfig.scopes.join(
            " ",
          ),
        );


      const existingSettings =
        await this.googleSettings
          .getSettings(
            session.workspace.id,
          );


      if(existingSettings?.spreadsheetId){

        return {
          connected:true,
          createdSheet:false,
          message:
            "Google Sheet already connected.",
        };

      }


      await this.googleSettings
        .autoCreateSheet(
          session.workspace.id,
          "MyPocket Workspace Template",
          profile.email,
        );


      return {
        connected:true,
        createdSheet:true,
        message:
          "Google Sheet template created successfully.",
      };

    }catch(error){

      const err =
        error as {
          message?:string;
        };


      return {
        connected:false,
        createdSheet:false,
        message:
          err.message
          ??
          "Google Sheet setup failed. Please reconnect from setup wizard.",
      };

    }

  }



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
