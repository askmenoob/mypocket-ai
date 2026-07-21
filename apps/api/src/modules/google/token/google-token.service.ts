import type {
  FastifyInstance,
} from "fastify";


import {
  google,
} from "googleapis";


import {
  GoogleRepository,
} from "../google.repository.js";


import {
  TokenEncryptionService,
} from "../crypto/token-encryption.service.js";


import {
  AppError,
} from "../../../shared/errors/index.js";


import {
  googleConfig,
} from "../../../config/google.js";



export class GoogleTokenService {


  private readonly repository:
    GoogleRepository;


  private readonly encryption:
    TokenEncryptionService;



  constructor(
    app:FastifyInstance,
  ){

    this.repository =
      new GoogleRepository(
        app.prisma,
      );


    this.encryption =
      new TokenEncryptionService();

  }





  async getAccessToken(
    workspaceId:string,
  ){


    const account =
      await this.repository
        .findByWorkspace(
          workspaceId,
        );


    if(
      !account ||
      !account.accessToken
    ){

      throw new AppError(
        "GOOGLE_NOT_CONNECTED",
        "Google account is not connected",
        400,
      );

    }


    return this.encryption
      .decrypt(
        account.accessToken,
      );

  }





  async getValidAccessToken(
    workspaceId:string,
  ){

    const account =
      await this.repository
        .findByWorkspace(
          workspaceId,
        );



    if(
      !account ||
      !account.refreshToken
    ){

      throw new AppError(
        "GOOGLE_REFRESH_TOKEN_MISSING",
        "Google refresh token is missing",
        400,
      );

    }



    const now =
      new Date();



    if(
      account.accessToken &&
      account.expiresAt &&
      account.expiresAt > now
    ){

      return this.encryption
        .decrypt(
          account.accessToken,
        );

    }





    const refreshToken =
      this.encryption
        .decrypt(
          account.refreshToken,
        );



    const oauth2 =
      new google.auth.OAuth2(
        googleConfig.clientId,
        googleConfig.clientSecret,
      );



    oauth2.setCredentials({

      refresh_token:
        refreshToken,

    });



    const response =
      await oauth2
        .getAccessToken();



    const newAccessToken =
      response.token;



    if(!newAccessToken){

      throw new AppError(
        "GOOGLE_TOKEN_REFRESH_FAILED",
        "Unable to refresh Google access token",
        400,
      );

    }



    const expiresAt =
      new Date(
        Date.now()
        +
        3600 * 1000,
      );



    await this.repository
      .updateTokens(
        workspaceId,

        this.encryption
          .encrypt(
            newAccessToken,
          ),

        account.refreshToken,

        expiresAt,

      );



    return newAccessToken;

  }





  async getRefreshToken(
    workspaceId:string,
  ){


    const account =
      await this.repository
        .findByWorkspace(
          workspaceId,
        );



    if(
      !account ||
      !account.refreshToken
    ){

      throw new AppError(
        "GOOGLE_REFRESH_TOKEN_MISSING",
        "Google refresh token is missing",
        400,
      );

    }



    return this.encryption
      .decrypt(
        account.refreshToken,
      );

  }


}
