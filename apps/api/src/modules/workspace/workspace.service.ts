import type { FastifyInstance } from "fastify";
import {
  WorkspaceRepository,
} from "./workspace.repository.js";


import {
  MemberRepository,
} from "../member/member.repository.js";

import type {
  WorkspaceContext,
} from "./workspace.types.js";


import {
  TokenService,
} from "../../shared/auth/index.js";


export class WorkspaceService {

  private readonly repository:
    WorkspaceRepository;


  private readonly memberRepository:
    MemberRepository;


  private readonly tokenService:
    TokenService;


  constructor(
    app: FastifyInstance,
  ) {

    this.repository =
      new WorkspaceRepository(
        app.prisma,
      );


    this.memberRepository =
      new MemberRepository(
        app.prisma,
      );


    this.tokenService =
      new TokenService(
        app,
      );

  }



  async getCurrentWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceContext> {


    const membership =
      await this.memberRepository
        .findMembership(
          userId,
          workspaceId,
        );


    if (!membership) {

      throw new Error(
        "WORKSPACE_NOT_FOUND",
      );

    }


    return {

      id:
        membership.workspace.id,

      name:
        membership.workspace.name,

      type:
        membership.workspace.type as WorkspaceContext["type"],

      role:
        membership.role as WorkspaceContext["role"],

    };

  }



  async getUserWorkspaces(
    userId: string,
  ): Promise<WorkspaceContext[]> {


    const memberships =

      await this.repository
        .findWorkspacesForUser(
          userId,
        );


    return memberships.map(
      (membership) => ({

        id:
          membership.workspace.id,

        name:
          membership.workspace.name,

        type:
          membership.workspace.type as WorkspaceContext["type"],

        role:
          membership.role as WorkspaceContext["role"],

      })
    );

  }






  async createWorkspace(
    userId:string,
    name:string,
    type:WorkspaceContext["type"],
  ):Promise<WorkspaceContext> {


    const workspace =

      await this.repository
        .createWorkspace(
          userId,
          name,
          type,
        );



    const membership =

      await this.memberRepository
        .createMember(
          workspace.id,
          userId,
          "OWNER",
        );



    return {

      id:
        workspace.id,

      name:
        workspace.name,

      type:
        workspace.type as WorkspaceContext["type"],

      role:
        membership.role as WorkspaceContext["role"],

    };


  }





  async switchWorkspace(
    userId:string,
    email:string,
    workspaceId:string,
  ) {


    const membership =

      await this.memberRepository
        .findMembership(
          userId,
          workspaceId,
        );



    if (!membership) {

      throw new Error(
        "WORKSPACE_ACCESS_DENIED",
      );

    }



    const token =

      await this.tokenService
        .generate(
          userId,
          email,
          workspaceId,
          membership.role,
        );



    return {

      token,

      workspaceId,

      role:
        membership.role,

    };


  }


}
