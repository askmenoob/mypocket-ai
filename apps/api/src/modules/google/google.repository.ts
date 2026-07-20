import type {
  PrismaClient,
} from "../../generated/prisma/client.js";



export class GoogleRepository {


  constructor(
    private readonly prisma:PrismaClient,
  ){}





  async findByWorkspace(
    workspaceId:string,
  ){

    return this.prisma.googleAccount.findUnique({

      where:{
        workspaceId,
      },

    });

  }





  async create(
    workspaceId:string,
    email:string,
    accessToken:string,
    refreshToken:string|null,
    expiresAt:Date|null,
    scopes:string|null,
  ){

    return this.prisma.googleAccount.create({

      data:{

        workspaceId,

        email,

        accessToken,

        refreshToken,

        expiresAt,

        scopes,

      },

    });

  }





  async updateTokens(
    workspaceId:string,
    accessToken:string,
    refreshToken:string|null,
    expiresAt:Date|null,
  ){

    return this.prisma.googleAccount.update({

      where:{
        workspaceId,
      },

      data:{

        accessToken,

        refreshToken,

        expiresAt,

        status:"CONNECTED",

      },

    });

  }






  async upsert(
    workspaceId:string,
    email:string,
    accessToken:string,
    refreshToken:string|null,
    expiresAt:Date|null,
    scopes:string|null,
  ){

    return this.prisma.googleAccount.upsert({

      where:{
        workspaceId,
      },


      create:{

        workspaceId,

        email,

        accessToken,

        refreshToken,

        expiresAt,

        scopes,

        status:
          "CONNECTED",

      },


      update:{

        email,

        accessToken,

        refreshToken,

        expiresAt,

        scopes,

        status:
          "CONNECTED",

        connectedAt:
          new Date(),

      },

    });

  }




  async disconnect(
    workspaceId:string,
  ){

    return this.prisma.googleAccount.update({

      where:{
        workspaceId,
      },

      data:{

        status:"DISCONNECTED",

        accessToken:null,

        refreshToken:null,

      },

    });

  }


}
