import type { PrismaClient } from "../../generated/prisma/client.js";
import type { GoogleProfile } from "./auth.types.js";


export class AuthRepository {


  constructor(
    private readonly prisma: PrismaClient,
  ) {}





  async findUserByEmail(
    email:string,
  ){

    return this.prisma.user.findUnique({

      where:{
        email,
      },

      include:{

        workspaces:true,

        subscription:true,

        memberships:true,

      },

    });

  }






  async findGoogleAccountByEmail(
    email:string,
  ){

    return this.prisma.googleAccount.findFirst({

      where:{
        email,
      },

      include:{

        workspace:{

          include:{

            owner:true,

          },

        },

      },

    });

  }







  async findUserSession(
    userId:string,
  ){

    return this.prisma.user.findUnique({

      where:{
        id:userId,
      },

      include:{

        memberships:{

          include:{

            workspace:true,

          },

        },

      },

    });

  }








  async createUserWithWorkspace(
    profile:GoogleProfile,
  ){


    return this.prisma.$transaction(

      async(tx)=>{


        const user =

          await tx.user.create({

            data:{

              email:
                profile.email,

              name:
                profile.name,

            },

          });





        const workspace =

          await tx.workspace.create({

            data:{

              name:
                `${profile.name} Workspace`,

              ownerId:
                user.id,

            },

          });





        await tx.workspaceMember.create({

          data:{

            userId:
              user.id,

            workspaceId:
              workspace.id,

            role:
              "OWNER",

          },

        });





        return {

          user,

          workspace,

        };


      },

    );


  }








  async createGoogleAccount(
    workspaceId:string,
    profile:GoogleProfile,
  ){

    return this.prisma.googleAccount.create({

      data:{

        email:
          profile.email,

        workspaceId,

      },

    });

  }


}
