import type {
  PrismaClient,
} from "../../generated/prisma/client.js";


export class MemberRepository {


  constructor(
    private readonly prisma: PrismaClient,
  ) {}



  async findMembers(
    workspaceId: string,
  ) {

    return this.prisma.workspaceMember.findMany({

      where: {
        workspaceId,
      },

      include: {

        user: true,

      },

      orderBy: {

        createdAt: "asc",

      },

    });

  }



  async findMember(
    id: string,
  ) {

    return this.prisma.workspaceMember.findUnique({

      where: {
        id,
      },

      include: {

        user: true,

      },

    });

  }



  async findUserByEmail(
    email: string,
  ) {

    return this.prisma.user.findUnique({

      where: {
        email,
      },

    });

  }



  async findMembership(
    userId: string,
    workspaceId: string,
  ) {

    return this.prisma.workspaceMember.findUnique({

      where: {

        userId_workspaceId: {

          userId,

          workspaceId,

        },

      },

      include: {

        workspace: true,

      },

    });

  }




  async createMember(
    workspaceId: string,
    userId: string,
    role:
      "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",
  ) {

    return this.prisma.workspaceMember.create({

      data: {

        workspaceId,

        userId,

        role,

      },

      include: {

        user: true,

      },

    });

  }



  async updateRole(
    id: string,
    role:
      "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",
  ) {

    return this.prisma.workspaceMember.update({

      where: {
        id,
      },

      data: {
        role,
      },

      include: {

        user: true,

      },

    });

  }



  async removeMember(
    id: string,
  ) {

    return this.prisma.workspaceMember.delete({

      where: {
        id,
      },

    });

  }


}
