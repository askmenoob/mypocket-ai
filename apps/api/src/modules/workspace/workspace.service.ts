import { createHash, randomBytes } from "node:crypto";
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






  async updateWorkspaceName(
    userId:string,
    workspaceId:string,
    requestedName:string,
  ):Promise<WorkspaceContext> {

    const membership =
      await this.memberRepository
        .findMembership(
          userId,
          workspaceId,
        );


    if(!membership){

      throw new AppError(
        "WORKSPACE_NOT_FOUND",
        "Workspace membership not found",
        404,
      );

    }


    if(
      membership.workspace.type !== "FAMILY"
      &&
      membership.workspace.type !== "BUSINESS"
    ){

      throw new AppError(
        "WORKSPACE_RENAME_NOT_AVAILABLE",
        "Workspace rename is only available for Family and Business workspaces",
        403,
      );

    }


    if(
      membership.role !== "OWNER"
      &&
      membership.role !== "ADMIN"
    ){

      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Only the Workspace Owner or Admin can rename this workspace",
        403,
      );

    }


    const name =
      requestedName
        .trim()
        .replace(
          /\s+/g,
          " ",
        );


    const workspace =
      await this.repository
        .updateWorkspaceName(
          workspaceId,
          name,
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


    const activeBilling =
      await this.app.prisma
        .workspaceBillingSubscription
        .findMany({
          where:{
            status:
              "ACTIVE",
          },

          select:{
            workspaceId:
              true,

            plan:
              true,

            status:
              true,
          },
        });


    const billingByWorkspace =
      new Map(
        activeBilling.map(
          (
            billing,
          ) => [
            billing.workspaceId,
            billing,
          ],
        ),
      );


    return users.map(
      (
        user,
      ) => {

        const memberships =
          [...user.memberships]
            .filter(
              (
                membership,
              ) =>
                Boolean(
                  membership.workspace,
                ),
            )
            .sort(
              (
                left,
                right,
              ) => {

                const leftOwned =
                  (
                    left.role === "OWNER"
                    &&
                    left.workspace.ownerId
                      === user.id
                  )
                    ? 1
                    : 0;


                const rightOwned =
                  (
                    right.role === "OWNER"
                    &&
                    right.workspace.ownerId
                      === user.id
                  )
                    ? 1
                    : 0;


                if(leftOwned !== rightOwned){

                  return rightOwned - leftOwned;

                }


                return (
                  left.createdAt.getTime()
                  -
                  right.createdAt.getTime()
                );

              },
            );


        const selectedMembership =
          memberships[0]
          ??
          null;


        const mapped =
          this.toAdminUserPackage({
            ...user,
            memberships,
          });


        const billing =
          selectedMembership
            ? billingByWorkspace.get(
                selectedMembership.workspaceId,
              )
            : null;


        const effectivePackage:
          WorkspacePackage =
            (
              billing?.plan
                === "PERSONAL_PRO"
              &&
              billing.status
                === "ACTIVE"
            )
              ? "PERSONAL_PRO"
              : mapped.package;


        return {
          ...mapped,

          package:
            effectivePackage,

          subscriptionPlan:
            effectivePackage,

          subscriptionStatus:
            billing?.status
            ??
            mapped.subscriptionStatus,
        };

      },
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
          (
            membership,
          ) =>
            Boolean(
              membership.workspace,
            ),
        )
        .sort(
          (
            left,
            right,
          ) => {

            const leftOwned =
              (
                left.role === "OWNER"
                &&
                left.workspace.ownerId
                  === user.id
              )
                ? 1
                : 0;


            const rightOwned =
              (
                right.role === "OWNER"
                &&
                right.workspace.ownerId
                  === user.id
              )
                ? 1
                : 0;


            if(leftOwned !== rightOwned){

              return rightOwned - leftOwned;

            }


            return (
              left.createdAt.getTime()
              -
              right.createdAt.getTime()
            );

          },
        )[0];



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


    if(
      activeMembership?.role
        !== "OWNER"
      ||
      workspace.ownerId
        !== user.id
    ){

      throw new AppError(
        "ADMIN_INHERITED_PACKAGE_READ_ONLY",
        "Inherited Family or Business access cannot replace an owned workspace package",
        409,
      );

    }



    if(
      packageType === "PERSONAL_PRO"
    ){

      const familyMembership =
        user.memberships.find(
          (item:any)=>
            item.workspace?.type === "FAMILY"
            &&
            item.role !== "OWNER"
        );


      if(familyMembership){

        throw new AppError(
          "USER_STILL_IN_FAMILY",
          "User must leave Family workspace first",
          403,
        );

      }

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

  async adminDeleteUser(
    input:{
      actorEmail:string;
      userId:string;
    },
  ){

    this.assertSuperAdmin(
      input.actorEmail,
    );

    const user =
      await this.app.prisma.user.findUnique({
        where:{
          id:
            input.userId,
        },
      });

    if(!user){
      throw new AppError(
        "USER_NOT_FOUND",
        "User not found",
        404,
      );
    }

    if(isSuperAdminEmail(user.email)){
      throw new AppError(
        "SUPER_ADMIN_DELETE_BLOCKED",
        "Super admin account cannot be deleted",
        400,
      );
    }

    await this.app.prisma.user.delete({
      where:{
        id:
          input.userId,
      },
    });

    return {
      success:
        true,

      deletedUserId:
        input.userId,
    };

  }




  async removeMember(
    input:{
      actorUserId:string;
      memberId:string;
    },
  ){

    const member =
      await this.app.prisma.workspaceMember.findUnique({
        where:{
          id:
            input.memberId,
        },
      });


    if(!member){

      throw new AppError(
        "MEMBER_NOT_FOUND",
        "Member not found",
        404,
      );

    }


    const actor =
      await this.app.prisma.workspaceMember.findUnique({
        where:{
          userId_workspaceId:{
            userId:
              input.actorUserId,

            workspaceId:
              member.workspaceId,
          },
        },
      });


    if(
      !actor
      ||
      (
        actor.role !== "OWNER"
        &&
        actor.role !== "ADMIN"
      )
    ){

      throw new AppError(
        "MEMBER_REMOVE_FORBIDDEN",
        "Only owner or admin can remove member",
        403,
      );

    }


    if(member.role === "OWNER"){

      throw new AppError(
        "OWNER_REMOVE_BLOCKED",
        "Workspace owner cannot be removed",
        400,
      );

    }


    await this.app.prisma.workspaceMember.delete({
      where:{
        id:
          input.memberId,
      },
    });


    return {
      success:true,
      removedMemberId:
        input.memberId,
    };

  }



  async createInvite(
    input:{
      actorUserId:string;
      workspaceId:string;
      email:string;
      whatsappPhoneNumber?:string;
      role:"ADMIN" | "MEMBER";
    },
  ){

    const actor =
      await this.app.prisma.workspaceMember.findUnique({
        where:{
          userId_workspaceId:{
            userId:
              input.actorUserId,

            workspaceId:
              input.workspaceId,
          },
        },
        include:{
          workspace:true,
        },
      });

    if(
      !actor
      ||
      (
        actor.role !== "OWNER"
        &&
        actor.role !== "ADMIN"
      )
    ){
      throw new AppError(
        "INVITE_FORBIDDEN",
        "Only Owner/Admin can invite members",
        403,
      );
    }

    if(actor.workspace.type === "PERSONAL"){
      throw new AppError(
        "INVITE_SHARED_WORKSPACE_REQUIRED",
        "Invite is only available for Family or Business workspace",
        400,
      );
    }

    const email =
      String(input.email || "")
        .trim()
        .toLowerCase();

    if(!email || !email.includes("@")){
      throw new AppError(
        "INVITE_EMAIL_REQUIRED",
        "Valid email is required",
        400,
      );
    }

    const role =
      input.role === "ADMIN"
        ? "ADMIN"
        : "MEMBER";

    if(actor.role === "ADMIN" && role === "ADMIN"){
      throw new AppError(
        "ADMIN_INVITE_LIMIT",
        "Admin cannot invite another admin",
        403,
      );
    }

    const token =
      randomBytes(32)
        .toString("hex");

    const tokenHash =
      createHash("sha256")
        .update(token)
        .digest("hex");

    const expiresAt =
      new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 7,
      );

    const invite =
      await this.app.prisma.workspaceInvite.create({
        data:{
          workspaceId:
            input.workspaceId,

          createdById:
            input.actorUserId,

          email,

          whatsappPhoneNumber:
            input.whatsappPhoneNumber
              ? String(input.whatsappPhoneNumber).replace(/\D/g, "")
              : null,

          role,

          tokenHash,

          expiresAt,
        },
      });

    return {
      inviteId:
        invite.id,

      email:
        invite.email,

      role:
        invite.role,

      whatsappPhoneNumber:
        invite.whatsappPhoneNumber,

      expiresAt:
        invite.expiresAt,

      inviteUrl:
        `https://app.imai.my/invite/${token}`,

      token,
    };

  }



  async acceptInvite(
    input:{
      userId:string;
      email:string;
      token:string;
    },
  ){

    const token =
      String(input.token || "")
        .trim();

    const email =
      String(input.email || "")
        .trim()
        .toLowerCase();

    if(!token){
      throw new AppError(
        "INVITE_TOKEN_REQUIRED",
        "Invite token is required",
        400,
      );
    }

    const tokenHash =
      createHash("sha256")
        .update(token)
        .digest("hex");

    const invite =
      await this.app.prisma.workspaceInvite.findUnique({
        where:{
          tokenHash,
        },
      });

    if(!invite){
      throw new AppError(
        "INVITE_NOT_FOUND",
        "Invite is not valid",
        404,
      );
    }

    if(invite.status !== "PENDING"){
      if(
        invite.status === "ACCEPTED"
        &&
        invite.acceptedById === input.userId
        &&
        invite.email.toLowerCase() === email
      ){
        const existingMember =
          await this.app.prisma.workspaceMember.findUnique({
            where:{
              userId_workspaceId:{
                userId:
                  input.userId,
                workspaceId:
                  invite.workspaceId,
              },
            },
          });

        if(existingMember){
          const authToken =
            await this.tokenService.generate(
              input.userId,
              email,
              invite.workspaceId,
              existingMember.role,
            );

          return {
            success:true,
            token:authToken,
            workspaceId:invite.workspaceId,
            memberId:existingMember.id,
            role:existingMember.role,
          };
        }
      }

      throw new AppError(
        "INVITE_NOT_FOUND",
        "Invite is not valid",
        404,
      );
    }

    if(invite.expiresAt.getTime() < Date.now()){
      await this.app.prisma.workspaceInvite.update({
        where:{
          id:
            invite.id,
        },
        data:{
          status:
            "EXPIRED",
        },
      });

      throw new AppError(
        "INVITE_EXPIRED",
        "Invite has expired",
        400,
      );
    }

    if(invite.email.toLowerCase() !== email){
      throw new AppError(
        "INVITE_EMAIL_MISMATCH",
        "Please login with the invited email",
        403,
      );
    }

    const member =
      await this.app.prisma.workspaceMember.upsert({
        where:{
          userId_workspaceId:{
            userId:
              input.userId,

            workspaceId:
              invite.workspaceId,
          },
        },
        update:{
          role:
            invite.role,

          whatsappPhoneNumber:
            invite.whatsappPhoneNumber,
        },
        create:{
          userId:
            input.userId,

          workspaceId:
            invite.workspaceId,

          role:
            invite.role,

          whatsappPhoneNumber:
            invite.whatsappPhoneNumber,
        },
      });

    await this.app.prisma.workspaceInvite.update({
      where:{
        id:
          invite.id,
      },
      data:{
        status:
          "ACCEPTED",

        acceptedById:
          input.userId,

        acceptedAt:
          new Date(),
      },
    });

    const authToken =
      await this.tokenService
        .generate(
          input.userId,
          email,
          invite.workspaceId,
          member.role,
        );

    return {
      success:
        true,

      token:
        authToken,

      workspaceId:
        invite.workspaceId,

      memberId:
        member.id,

      role:
        member.role,
    };

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

      status:
        user.status
        ??
        "ACTIVE",

      bannedAt:
        user.bannedAt
          ?.toISOString()
        ??
        null,

      deactivatedAt:
        user.deactivatedAt
          ?.toISOString()
        ??
        null,

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
