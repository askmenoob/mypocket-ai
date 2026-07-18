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



  async updateRole(
    id: string,
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER",
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
