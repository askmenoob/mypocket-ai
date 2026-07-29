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

import {
  env,
} from "../../config/env.js";

import {
  GoogleSettingsService,
} from "../google/settings/google-settings.service.js";


export class WorkspaceService {

  private readonly app:
    FastifyInstance;


  private readonly repository:
    WorkspaceRepository;


  private readonly memberRepository:
    MemberRepository;


  private readonly tokenService:
    TokenService;


  private readonly googleSettingsService:
    GoogleSettingsService;


  constructor(
    app: FastifyInstance,
  ) {

    this.app =
      app;


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


    this.googleSettingsService =
      new GoogleSettingsService(
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


    const activeMembership =
      [...user.memberships]
        .filter(
          (item) =>
            Boolean(
              item.workspace,
            ),
        )
        .sort(
          (left, right) =>
            right.createdAt.getTime()
            -
            left.createdAt.getTime(),
        )
        .find(
          (item) =>
            item.role === "OWNER",
        )
      ??
      null;


    const workspace =
      activeMembership?.workspace
      ??
      null;


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



  async adminUpgradeUserGoogleSheet(
    actorEmail:string,
    userId:string,
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
      this.resolveAdminUserPrimaryWorkspace(
        user,
      );


    if(!workspace){

      throw new AppError(
        "ADMIN_USER_WORKSPACE_NOT_FOUND",
        "User workspace not found",
        404,
      );

    }


    const setting =
      await this.googleSettingsService
        .autoCreateSheet(
          workspace.id,
          `MyPocket ${workspace.type} Template`,
        );


    const updated =
      await this.repository
        .findAdminUserById(
          userId,
        );


    return {
      message:
        `Google Sheet upgraded to ${workspace.type} template.`,

      google:
        setting,

      user:
        this.toAdminUserPackage(
          updated!,
        ),
    };

  }



  async adminDisconnectUserWhatsApp(
    actorEmail:string,
    userId:string,
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
      this.resolveAdminUserPrimaryWorkspace(
        user,
      );


    if(!workspace){

      throw new AppError(
        "ADMIN_USER_WORKSPACE_NOT_FOUND",
        "User workspace not found",
        404,
      );

    }


    const instances =
      await this.app.prisma.whatsAppInstance
        .findMany({
          where:{
            workspaceId:
              workspace.id,
          },
        });


    for(const instance of instances){

      await this.destroyEvolutionInstance(
        instance.instanceName,
      );

    }


    if(instances.length){

      await this.app.prisma.whatsAppInstance
        .deleteMany({
          where:{
            workspaceId:
              workspace.id,
          },
        });

    }


    const updated =
      await this.repository
        .findAdminUserById(
          userId,
        );


    return {
      message:
        "WhatsApp pairing disconnected by super admin.",

      disconnected:
        instances.length,

      user:
        this.toAdminUserPackage(
          updated!,
        ),
    };

  }



  async adminSetUserAccessStatus(
    actorEmail:string,
    userId:string,
    status:
      | "ACTIVE"
      | "BANNED"
      | "DEACTIVATED",
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


    if(
      isSuperAdminEmail(
        user.email,
      )
      &&
      status !== "ACTIVE"
    ){

      throw new AppError(
        "SUPER_ADMIN_SELF_PROTECTION",
        "Super admin account cannot be banned or deactivated",
        400,
      );

    }


    await this.app.prisma.user
      .update({
        where:{
          id:
            userId,
        },

        data:{
          status,

          bannedAt:
            status === "BANNED"
              ? new Date()
              : null,

          deactivatedAt:
            status === "DEACTIVATED"
              ? new Date()
              : null,
        },
      });


    const updated =
      await this.repository
        .findAdminUserById(
          userId,
        );


    return this.toAdminUserPackage(
      updated!,
    );

  }



  private resolveAdminUserPrimaryWorkspace(
    user:{
      memberships:Array<{
        role:string;
        createdAt:Date;
        workspace:any;
      }>;
    },
  ){

    const orderedMemberships =
      [...user.memberships]
        .filter(
          (item) =>
            Boolean(
              item.workspace,
            ),
        )
        .sort(
          (left, right) =>
            right.createdAt.getTime()
            -
            left.createdAt.getTime(),
        );


    const activeMembership =
      orderedMemberships.find(
        (item) =>
          item.role === "OWNER",
      )
      ??
      orderedMemberships[0]
      ??
      null;


    return activeMembership?.workspace
      ??
      null;

  }



  private async destroyEvolutionInstance(
    instanceName:string,
  ){

    if(!env.EVOLUTION_API_KEY){

      return;

    }


    for(const endpoint of [
      `/instance/logout/${encodeURIComponent(instanceName)}`,
      `/instance/delete/${encodeURIComponent(instanceName)}`,
    ]){

      try{

        await fetch(
          `${env.EVOLUTION_API_URL}${endpoint}`,
          {
            method:
              "DELETE",

            headers:{
              apikey:
                env.EVOLUTION_API_KEY,
            },
          },
        );

      }catch(error){

        console.error(
          "SUPER_ADMIN_EVOLUTION_DESTROY_FAILED:",
          endpoint,
          error,
        );

      }

    }

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
      status?:string;
      bannedAt?:Date | null;
      deactivatedAt?:Date | null;

      subscription?:{
        plan:string;
        status:string;
      } | null;

      workspaces:Array<any>;

      memberships:Array<{
        workspaceId:string;
        role:string;
        createdAt:Date;
        workspace:any;
      }>;
    },
  ){

    const orderedMemberships =
      [...user.memberships]
        .filter(
          (item) =>
            Boolean(
              item.workspace,
            ),
        )
        .sort(
          (left, right) =>
            right.createdAt.getTime()
            -
            left.createdAt.getTime(),
        );


    const activeMembership =
      orderedMemberships.find(
        (item) =>
          item.role === "OWNER",
      )
      ??
      orderedMemberships[0]
      ??
      null;


    const workspace =
      activeMembership?.workspace
      ??
      null;


    const workspaceType =
      workspace?.type as
        WorkspaceType
        |
        undefined;


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

      isSuperAdmin:
        isSuperAdminEmail(
          user.email,
        ),

      package:
        this.resolveUserPackage(
          workspaceType,
          subscriptionPlan,
        ),

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

            role:
              activeMembership?.role
              ??
              null,

            memberCount:
              workspace.members?.length
              ??
              0,

            googleConnected:
              Boolean(
                workspace.googleSetting,
              ),

            spreadsheetId:
              workspace.googleSetting
                ?.spreadsheetId
              ??
              null,

            whatsappCount:
              workspace.whatsapp?.length
              ??
              0,

            whatsappConnectedCount:
              workspace.whatsapp
                ?.filter(
                  (instance:any) =>
                    [
                      "ONLINE",
                      "CONNECTED",
                      "OPEN",
                    ].includes(
                      String(
                        instance.status
                        ??
                        "",
                      ).toUpperCase(),
                    ),
                )
                .length
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
