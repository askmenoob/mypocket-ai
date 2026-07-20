import type {
  FastifyInstance,
} from "fastify";


import {
  googleConfig,
} from "../../../config/google.js";


import {
  GoogleService,
} from "../google.service.js";


import {
  TokenEncryptionService,
} from "../crypto/token-encryption.service.js";


import {
  AppError,
} from "../../../shared/errors/index.js";



export class GoogleOAuthService {


  private readonly googleService:
    GoogleService;


  private readonly encryption:
    TokenEncryptionService;



  constructor(
    app:FastifyInstance,
  ){

    this.googleService =
      new GoogleService(
        app,
      );


    this.encryption =
      new TokenEncryptionService();

  }





  generateAuthorizationUrl(
    state:string,
  ){


    const params =
      new URLSearchParams({


        client_id:
          googleConfig.clientId ?? "",


        redirect_uri:
          googleConfig.redirectUri ?? "",


        response_type:
          "code",


        access_type:
          "offline",


        prompt:
          "consent",


        scope:
          googleConfig.scopes.join(
            " ",
          ),


        state,

      });



    return (
      "https://accounts.google.com/o/oauth2/v2/auth?"
      +
      params.toString()
    );

  }





  async exchangeCodeForToken(
    code:string,
  ){


    const body =
      new URLSearchParams({


        code,


        client_id:
          googleConfig.clientId ?? "",


        client_secret:
          googleConfig.clientSecret ?? "",


        redirect_uri:
          googleConfig.redirectUri ?? "",


        grant_type:
          "authorization_code",

      });



    const response =
      await fetch(
        "https://oauth2.googleapis.com/token",
        {

          method:
            "POST",


          headers:{
            "Content-Type":
              "application/x-www-form-urlencoded",
          },


          body:
            body.toString(),

        },
      );



    if(
      !response.ok
    ){

      throw new AppError(
        "GOOGLE_OAUTH_FAILED",
        "Google OAuth token exchange failed",
        400,
      );

    }



    const data =
      await response.json();



    return {

      accessToken:
        data.access_token,


      refreshToken:
        data.refresh_token,


      expiresIn:
        data.expires_in,

    };


  }






  async connectWorkspaceGoogleAccount(
    workspaceId:string,
    code:string,
  ){


    const token =
      await this.exchangeCodeForToken(
        code,
      );



    const expiresAt =
      token.expiresIn
        ? new Date(
            Date.now()
            +
            token.expiresIn * 1000,
          )
        : null;



    const encryptedAccessToken =
      this.encryption.encrypt(
        token.accessToken,
      );



    const encryptedRefreshToken =
      token.refreshToken
        ? this.encryption.encrypt(
            token.refreshToken,
          )
        : null;



    return this.googleService
      .connect(

        "OWNER",

        workspaceId,

        "google-account",

        encryptedAccessToken,

        encryptedRefreshToken,

        expiresAt,

        googleConfig.scopes.join(
          " ",
        ),

      );


  }



}
