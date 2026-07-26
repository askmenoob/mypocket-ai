import type {
  PrismaClient,
} from "../../../generated/prisma/client.js";



export class GoogleTemplateRepository {


  constructor(
    private readonly prisma:PrismaClient,
  ){}





  async findActiveByType(
    type:
      | "PERSONAL"
      | "FAMILY"
      | "BUSINESS",
  ){


    return this.prisma.googleTemplate.findFirst({

      where:{

        type,

        active:true,

      },

      orderBy:{

        createdAt:
          "desc",

      },

    });


  }



}
