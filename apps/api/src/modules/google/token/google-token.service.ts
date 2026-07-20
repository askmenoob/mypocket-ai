import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleRepository,
} from "../google.repository.js";


import {
  TokenEncryptionService,
} from "../crypto/token-encryption.service.js";


import {
  AppError,
} from "../../../shared/errors/index.js";



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
