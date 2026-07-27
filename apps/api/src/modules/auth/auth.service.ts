import type { FastifyInstance } from "fastify";
import { AuthRepository } from "./auth.repository.js";
import { GoogleService } from "./google.service.js";
import type {
  GoogleProfile,
  AuthSession,
} from "./auth.types.js";


import {
  TokenService,
} from "../../shared/auth/index.js";
import {
  AppError,
} from "../../shared/errors/index.js";

export class AuthService {

  private readonly repository: AuthRepository;
  private readonly google: GoogleService;
  private readonly tokenService: TokenService;

  constructor(
    private readonly app: FastifyInstance,
  ) {
    this.repository = new AuthRepository(
      app.prisma,
    );

    this.google = new GoogleService();


    this.tokenService =
      new TokenService(
        app,
      );
  }


  getGoogleLoginUrl() {
    return this.google.getAuthorizationUrl();
  }


  async loginWithGoogle(
    profile: GoogleProfile,
  ): Promise<AuthSession> {

    let user =
      await this.repository.findUserByEmail(
        profile.email,
      );

    let workspace;


    if (!user) {

      const result =
        await this.repository.createUserWithWorkspace(
          profile,
        );

      user = await this.repository.findUserByEmail(
        result.user.email,
      );

      workspace = result.workspace;


      await this.repository.createGoogleAccount(
        workspace.id,
        profile,
      );

    } else {

      workspace = user.workspaces[0];

    }


    if (!user || !workspace) {
      throw new Error(
        "AUTH_PROVISION_FAILED",
      );
    }


    const membership =
      user.memberships?.find(
        (item) =>
          item.workspaceId === workspace.id
      );


    const token =
      await this.tokenService.generate(
        user.id,
        user.email,
        workspace.id,
        membership?.role
        ??
        "OWNER",
      );


    return {
      token,

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },

      workspace: {
        id: workspace.id,
        name: workspace.name,
        type:
          workspace.type,
        onboardingCompletedAt:
          workspace.onboardingCompletedAt,
        role:
          membership?.role
          ??
          "OWNER",
      },
    };
  }





  async getCurrentSession(
    userId: string,
  ) {

    const user =
      await this.repository.findUserSession(
        userId,
      );


    if (!user) {

      throw new Error(
        "USER_NOT_FOUND",
      );

    }


    const membership =
      user.memberships[0];


    if (!membership) {

      throw new Error(
        "WORKSPACE_MEMBERSHIP_NOT_FOUND",
      );

    }


    const workspace =
      membership.workspace;


    if (!workspace) {

      throw new Error(
        "WORKSPACE_NOT_FOUND",
      );

    }


    return {

      user: {

        id: user.id,

        email: user.email,

        name: user.name,

      },


      workspace: {

        id: workspace.id,

        name: workspace.name,

        type: workspace.type,

        onboardingCompletedAt:
          workspace.onboardingCompletedAt,

        role: membership.role,

      },

    };

  }




  async completeOnboarding(
    userId:string,
    workspaceId:string,
  ){

    const member =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            userId,
            workspaceId,
          },
        });


    if(!member){

      throw new AppError(
        "WORKSPACE_MEMBERSHIP_NOT_FOUND",
        "Workspace membership not found",
        404,
      );

    }


    if(
      member.role !== "OWNER"
      &&
      member.role !== "ADMIN"
    ){

      throw new AppError(
        "ONBOARDING_COMPLETE_FORBIDDEN",
        "Only Owner/Admin can complete workspace setup",
        403,
      );

    }


    const workspace =
      await this.app.prisma.workspace
        .update({
          where:{
            id:
              workspaceId,
          },

          data:{
            onboardingCompletedAt:
              new Date(),
          },

          select:{
            id:true,
            name:true,
            type:true,
            onboardingCompletedAt:true,
          },
        });


    return {
      workspace,
    };

  }


}
