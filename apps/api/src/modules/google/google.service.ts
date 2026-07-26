import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleRepository,
} from "./google.repository.js";


import {
  AppError,
} from "../../shared/errors/index.js";



export class GoogleService {


  private readonly repository:
    GoogleRepository;



  constructor(
    app:FastifyInstance,
  ){

    this.repository =
      new GoogleRepository(
        app.prisma,
      );

  }





  async getStatus(
    workspaceId:string,
  ){

    const account =
      await this.repository
        .findByWorkspace(
          workspaceId,
        );


    return {

      connected:
        !!account,

      account,

    };

  }





  async connect(
    actorRole:
      "OWNER"
      |
      "ADMIN"
      |
      "MEMBER"
      |
      "VIEWER",

    workspaceId:string,

    email:string,

    accessToken:string,

    refreshToken:string|null,

    expiresAt:Date|null,

    scopes:string|null,

  ){


    if(
      actorRole !== "OWNER"
      &&
      actorRole !== "ADMIN"
    ){

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Only owner or admin can connect Google account",
        403,
      );

    }



    const existing =
      await this.repository
        .findByWorkspace(
          workspaceId,
        );


    if(existing){

      return this.repository
        .updateTokens(
          workspaceId,
          email,
          accessToken,
          refreshToken ?? existing.refreshToken ?? null,
          expiresAt,
        );

    }



    return this.repository
      .create(
        workspaceId,
        email,
        accessToken,
        refreshToken,
        expiresAt,
        scopes,
      );

  }





  async disconnect(
    actorRole:
      "OWNER"
      |
      "ADMIN"
      |
      "MEMBER"
      |
      "VIEWER",

    workspaceId:string,
  ){

    if(
      actorRole !== "OWNER"
      &&
      actorRole !== "ADMIN"
    ){

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Only owner or admin can disconnect Google account",
        403,
      );

    }


    return this.repository
      .disconnect(
        workspaceId,
      );

  }


}
