import type { FastifyInstance } from "fastify";
import { AuthRepository } from "./auth.repository.js";
import { GoogleService } from "./google.service.js";
import type {
  GoogleProfile,
  AuthSession,
} from "./auth.types.js";

export class AuthService {

  private readonly repository: AuthRepository;
  private readonly google: GoogleService;

  constructor(
    private readonly app: FastifyInstance,
  ) {
    this.repository = new AuthRepository(
      app.prisma,
    );

    this.google = new GoogleService();
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


    const token =
      await this.app.jwt.sign({
        userId: user.id,
        email: user.email,
        workspaceId: workspace.id,
      });


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

        role: membership.role,

      },

    };

  }


}
