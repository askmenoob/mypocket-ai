import type { FastifyInstance } from "fastify";
import {
  WorkspaceRepository,
} from "./workspace.repository.js";


import {
  MemberRepository,
} from "../member/member.repository.js";

import type {
  WorkspaceContext,
  WorkspacePackage,
  WorkspaceType,
} from "./workspace.types.js";


import {
  TokenService,
  isSuperAdminEmail,
} from "../../shared/auth/index.js";


import {
  AppError,
} from "../../shared/errors/index.js";


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



  async listAdminUsers(
    actorEmail:string,
  ){

    this.assertSuperAdmin(
      actorEmail,
    );


    const users =
      await this.repository
        .findAdminUsers();


    return users
      .map(
        (user) =>
          this.toAdminUserPackage(
            user,
          ),
      );

  }



  async updateUserPackage(
    actorEmail:string,
    userId:string,
    packageType:WorkspacePackage,
  ){

    this.assertSuperAdmin(
      actorEmail,
    );


    const user =
      await this.repository
        .findAdminUserById(
          userId,
        );


    if(!user){

      throw new AppError(
        "ADMIN_USER_NOT_FOUND",
        "User not found",
        404,
      );

    }


    const workspace =
      user.workspaces[0]
      ??
      user.memberships[0]?.workspace;


    if(!workspace){

      throw new AppError(
        "ADMIN_USER_WORKSPACE_NOT_FOUND",
        "User workspace not found",
        404,
      );

    }


    const workspaceType =
      this.packageToWorkspaceType(
        packageType,
      );


    await this.repository
      .updateWorkspaceType(
        workspace.id,
        workspaceType,
      );


    await this.repository
      .upsertSubscriptionPlan(
        user.id,
        packageType,
      );


    const updated =
      await this.repository
        .findAdminUserById(
          userId,
        );


    return this.toAdminUserPackage(
      updated!,
    );

  }



  private packageToWorkspaceType(
    packageType:WorkspacePackage,
  ):WorkspaceType{

    if(packageType === "PERSONAL_PRO"){

      return "PERSONAL";

    }


    return packageType;

  }



  private resolveUserPackage(
    workspaceType:WorkspaceType | null | undefined,
    subscriptionPlan:string | null | undefined,
  ):WorkspacePackage{

    if(
      workspaceType === "PERSONAL"
      &&
      subscriptionPlan === "PERSONAL_PRO"
    ){

      return "PERSONAL_PRO";

    }


    if(
      workspaceType === "FAMILY"
      ||
      workspaceType === "BUSINESS"
    ){

      return workspaceType;

    }


    return "PERSONAL";

  }



  private assertSuperAdmin(
    email:string,
  ){

    if(
      !isSuperAdminEmail(
        email,
      )
    ){

      throw new AppError(
        "SUPER_ADMIN_REQUIRED",
        "Only super admin can manage user packages",
        403,
      );

    }

  }



  private toAdminUserPackage(
    user:{
      id:string;
      email:string;
      name:string | null;
      createdAt:Date;
      updatedAt:Date;
      subscription?:{
        plan:string;
        status:string;
      } | null;
      workspaces:Array<any>;
      memberships:Array<{
        workspace:any;
      }>;
    },
  ){

    const workspace =
      user.workspaces[0]
      ??
      user.memberships[0]?.workspace
      ??
      null;

    const workspaceType =
      workspace?.type as WorkspaceType | undefined;

    const subscriptionPlan =
      user.subscription?.plan
      ??
      "FREE";


    return {

      userId:
        user.id,

      email:
        user.email,

      name:
        user.name,

      package:
        this.resolveUserPackage(
          workspaceType,
          subscriptionPlan,
        ),

      subscriptionPlan:
        subscriptionPlan,

      subscriptionStatus:
        user.subscription?.status
        ??
        "ACTIVE",

      workspace:
        workspace
          ? {
            id:
              workspace.id,

            name:
              workspace.name,

            type:
              workspace.type,

            memberCount:
              workspace.members?.length
              ??
              0,

            googleConnected:
              Boolean(
                workspace.googleSetting,
              ),

            whatsappCount:
              workspace.whatsapp?.length
              ??
              0,
          }
          : null,

      createdAt:
        user.createdAt,

      updatedAt:
        user.updatedAt,

    };

  }


}
