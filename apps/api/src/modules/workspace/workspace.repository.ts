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

}
