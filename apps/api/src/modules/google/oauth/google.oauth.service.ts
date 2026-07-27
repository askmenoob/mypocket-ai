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
    private readonly app:FastifyInstance,
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





  private async fetchAccountEmail(
    accessToken:string,
  ){

    const response =
      await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {

          headers:{
            Authorization:
              `Bearer ${accessToken}`,
          },

        },
      );


    if(!response.ok){

      throw new AppError(
        "GOOGLE_PROFILE_FETCH_FAILED",
        "Unable to fetch Google profile information",
        400,
      );

    }


    const data =
      await response.json() as {
        email?:string;
      };


    if(!data.email){

      throw new AppError(
        "GOOGLE_PROFILE_MISSING_EMAIL",
        "Google profile did not return an email address",
        400,
      );

    }


    return data.email.toLowerCase();

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


    const email =
      await this.fetchAccountEmail(
        data.access_token,
      );


    return {

      accessToken:
        data.access_token,


      refreshToken:
        data.refresh_token,


      expiresIn:
        data.expires_in,


      email,

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


    const workspace =
      await this.app.prisma.workspace
        .findUnique({

          where:{
            id:
              workspaceId,
          },

          include:{
            owner:{
              select:{
                email:
                  true,
              },
            },
          },

        });


    if(!workspace){

      throw new AppError(
        "WORKSPACE_NOT_FOUND",
        "Workspace not found for Google connection",
        404,
      );

    }


    const ownerEmail =
      workspace.owner.email
        .toLowerCase();


    if(
      token.email !== ownerEmail
    ){

      throw new AppError(
        "GOOGLE_ACCOUNT_MISMATCH",
        `Please connect Google using the workspace owner email: ${ownerEmail}`,
        403,
      );

    }


    if(!token.refreshToken){

      throw new AppError(
        "GOOGLE_REFRESH_TOKEN_MISSING",
        "Google OAuth did not return a refresh token. Please reconnect and grant offline access.",
        400,
      );

    }


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

        token.email,

        encryptedAccessToken,

        encryptedRefreshToken,

        expiresAt,

        googleConfig.scopes.join(
          " ",
        ),

      );


  }



}
