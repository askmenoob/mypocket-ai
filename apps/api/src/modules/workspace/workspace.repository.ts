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



  async findAdminUsers(){

    return this.prisma.user.findMany({

      orderBy:{
        createdAt:
          "desc",
      },

      include:{
        subscription:
          true,

        workspaces:{
          orderBy:{
            createdAt:
              "asc",
          },

          include:{
            members:
              true,

            googleSetting:
              true,

            whatsapp:
              true,
          },
        },

        memberships:{
          include:{
            workspace:{
              include:{
                members:
                  true,

                googleSetting:
                  true,

                whatsapp:
                  true,
              },
            },
          },
        },
      },
    });

  }



  async findAdminUserById(
    userId:string,
  ){

    return this.prisma.user.findUnique({

      where:{
        id:
          userId,
      },

      include:{
        subscription:
          true,

        workspaces:{
          orderBy:{
            createdAt:
              "asc",
          },

          include:{
            members:
              true,

            googleSetting:
              true,

            whatsapp:
              true,
          },
        },

        memberships:{
          include:{
            workspace:{
              include:{
                members:
                  true,

                googleSetting:
                  true,

                whatsapp:
                  true,
              },
            },
          },
        },
      },
    });

  }



  async updateWorkspaceType(
    workspaceId:string,

    type:
      "PERSONAL"
      | "FAMILY"
      | "BUSINESS",
  ){

    return this.prisma.workspace.update({

      where:{
        id:
          workspaceId,
      },

      data:{
        type,
      },

    });

  }



  async upsertSubscriptionPlan(
    userId:string,

    plan:
      "PERSONAL"
      | "PERSONAL_PRO"
      | "FAMILY"
      | "BUSINESS",
  ){

    return this.prisma.subscription.upsert({

      where:{
        userId,
      },

      create:{
        userId,
        plan,
        status:
          "ACTIVE",
      },

      update:{
        plan,
        status:
          "ACTIVE",
      },

    });

  }



}
