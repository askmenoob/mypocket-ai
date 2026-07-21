import type { PrismaClient } from "../../generated/prisma/client.js";


export class WorkspaceRepository {

  constructor(
    private readonly prisma: PrismaClient,
  ) {}


  async findWorkspaceForUser(
    userId: string,
  ) {

    return this.prisma.workspaceMember.findFirst({
      where: {
        userId,
      },

      include: {
        workspace: true,
      },
    });

  }



  async findWorkspacesForUser(
    userId: string,
  ) {

    return this.prisma.workspaceMember.findMany({

      where: {
        userId,
      },

      include: {
        workspace: true,
      },

    });

  }





  async findWorkspaceById(
    workspaceId: string,
  ) {

    return this.prisma.workspace.findUnique({

      where: {
        id:
          workspaceId,
      },

    });

  }





  async createWorkspace(
    userId: string,
    name: string,
    type:
      "PERSONAL"
      | "FAMILY"
      | "BUSINESS",
  ) {


    return this.prisma.workspace.create({

      data: {

        name,

        type,

        ownerId:
          userId,

      },

    });


  }



}
