import type {
  PrismaClient,
} from "../../generated/prisma/client.js";


import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "./transaction.types.js";



export class TransactionRepository {


  constructor(
    private readonly prisma:PrismaClient,
  ){}



  async findTransactions(
    workspaceId:string,
  ){

    return this.prisma.transaction.findMany({

      where:{
        workspaceId,
      },

      include:{

        category:true,

        merchant:true,

        paymentMethod:true,

        createdBy:true,

      },

      orderBy:{

        createdAt:"desc",

      },

    });

  }




  async findTransaction(
    workspaceId:string,
    id:string,
  ){

    return this.prisma.transaction.findFirst({

      where:{

        id,

        workspaceId,

      },

      include:{

        category:true,

        merchant:true,

        paymentMethod:true,

        createdBy:true,

      },

    });

  }





  async createTransaction(
    input:CreateTransactionInput,
  ){

    return this.prisma.transaction.create({

      data:{

        workspaceId:
          input.workspaceId,

        createdById:
          input.createdById,

        amount:
          input.amount,

        currency:
          input.currency ?? "MYR",

        type:
          input.type,

        description:
          input.description,

        transactionDate:
          input.transactionDate,

        categoryId:
          input.categoryId,

        merchantId:
          input.merchantId,

        paymentMethodId:
          input.paymentMethodId,

        receiptUrl:
          input.receiptUrl,

      },

      include:{

        category:true,

        merchant:true,

        paymentMethod:true,

      },

    });

  }





  async updateTransaction(
    workspaceId:string,
    id:string,
    input:UpdateTransactionInput,
  ){

    return this.prisma.transaction.update({

      where:{

        id,

      },

      data:{

        ...input,

      },

    });

  }





  async deleteTransaction(
    workspaceId:string,
    id:string,
  ){

    return this.prisma.transaction.delete({

      where:{

        id,

      },

    });

  }


}
