import type {
  FastifyInstance,
} from "fastify";


import {
  env,
} from "../../config/env.js";


import {
  TransactionService,
} from "../transaction/transaction.service.js";

import {
  CommitmentService,
} from "../commitment/commitment.service.js";


import {
  AppError,
} from "../../shared/errors/index.js";

import {
  isSuperAdminEmail,
} from "../../shared/auth/index.js";

import QRCode from "qrcode";


import type {
  NormalizedEvolutionMessage,
  ParsedWhatsAppTransaction,
  WhatsAppDevInstanceInput,
  WhatsAppDevTransactionInput,
  WhatsAppTransactionType,
} from "./whatsapp.types.js";


import {
  WhatsAppReplyBuilder,
} from "./whatsapp-reply.builder.js";


import {
  WhatsAppSheetSyncService,
} from "./whatsapp-sheet-sync.service.js";


import {
  WhatsAppCommandParser,
  type WhatsAppCommandKind,
  type WhatsAppEditCommand,
  type WhatsAppListCommand,
} from "./whatsapp-command.parser.js";



export class WhatsAppService {


  private readonly transactionService:
    TransactionService;

  private readonly commitmentService:
    CommitmentService;


  private readonly sheetSyncService:
    WhatsAppSheetSyncService;



  constructor(
    private readonly app:FastifyInstance,
  ){

    this.transactionService =
      new TransactionService(
        app,
      );

    this.commitmentService =
      new CommitmentService(
        app,
      );


    this.sheetSyncService =
      new WhatsAppSheetSyncService(
        app,
      );

  }





  async getEvolutionQrBase64(
    instanceName:string,
  ){

    if(
      !env.EVOLUTION_API_KEY
    ){

      throw new AppError(
        "EVOLUTION_API_KEY_MISSING",
        "Evolution API key is not configured",
        500,
      );

    }


    await this.ensureEvolutionInstance(
      instanceName,
    );


    const response =
      await fetch(
        `${env.EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instanceName)}`,
        {
          headers:{
            apikey:
              env.EVOLUTION_API_KEY,
          },
        },
      );


    if(!response.ok){

      throw new AppError(
        "EVOLUTION_QR_FETCH_FAILED",
        "Cannot fetch Evolution QR",
        response.status,
      );

    }


    const data =
      await response.json() as Record<string, unknown>;


    const base64 =
      this.asString(
        data.base64,
      )
      ||
      this.asString(
        this.asRecord(
          data.qrcode,
        ).base64,
      );

    if(base64){

      return base64;

    }


    const code =
      this.asString(
        data.code,
      )
      ||
      this.asString(
        this.asRecord(
          data.qrcode,
        ).code,
      );


    if(code){

      return QRCode
        .toDataURL(
          code,
          {
            margin:
              2,

            width:
              320,
          },
        );

    }


    throw new AppError(
      "EVOLUTION_QR_NOT_FOUND",
      "Evolution QR not found",
      404,
    );

  }





  async getOrCreateWorkspaceWhatsAppInstance(
    workspaceId:string,
  ){

    const existing =
      await this.app.prisma.whatsAppInstance
        .findFirst({
          where:{
            workspaceId,
          },

          orderBy:{
            updatedAt:
              "desc",
          },
        });


    if(existing){

      return existing;

    }


    const instanceName =
      this.buildWorkspaceInstanceName(
        workspaceId,
      );


    const instance =
      await this.app.prisma.whatsAppInstance
        .create({
          data:{
            instanceName,

            phoneNumber:
              null,

            status:
              "PENDING_PAIRING",

            workspaceId,
          },
        });


    await this.ensureEvolutionInstance(
      instanceName,
    );


    return instance;

  }




  async getWorkspaceWhatsAppInstanceForPairing(
    workspaceId:string,
  ){

    const instance =
      await this.getOrCreateWorkspaceWhatsAppInstance(
        workspaceId,
      );


    const refreshedInstance =
      await this.refreshWorkspaceInstanceStatus(
        instance,
      );


    if(
      this.isConnectedWhatsAppStatus(
        refreshedInstance.status,
      )
    ){

      throw new AppError(
        "WHATSAPP_INSTANCE_ALREADY_CONNECTED",
        "WhatsApp bot is already connected. Disconnect it before opening a new QR.",
        409,
      );

    }


    return refreshedInstance;

  }




  async disconnectWorkspaceWhatsAppInstance(
    input:{
      actorUserId:string;

      workspaceId:string;
    },
  ){

    const actorMember =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            userId:
              input.actorUserId,
          },

          include:{
            user:true,
          },
        });


    if(
      !actorMember
      ||
      (
        actorMember.role !== "OWNER"
        &&
        actorMember.role !== "ADMIN"
        &&
        !await this.isSuperAdminUserId(
          input.actorUserId,
        )
      )
    ){

      throw new AppError(
        "WHATSAPP_INSTANCE_DISCONNECT_FORBIDDEN",
        "Only Owner/Admin can disconnect WhatsApp bot",
        403,
      );

    }


    const existing =
      await this.app.prisma.whatsAppInstance
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,
          },

          orderBy:{
            updatedAt:
              "desc",
          },
        });


    if(existing){

      await this.destroyEvolutionInstance(
        existing.instanceName,
      );


      await this.app.prisma.whatsAppInstance
        .delete({
          where:{
            id:
              existing.id,
          },
        });

    }


    return {
      message:
        "WhatsApp bot disconnected. Open QR again only when you want to pair a new bot device.",

      disconnected:
        true,
    };

  }




  async resetWorkspaceWhatsAppInstance(
    input:{
      actorUserId:string;

      workspaceId:string;
    },
  ){

    return this.disconnectWorkspaceWhatsAppInstance(
      input,
    );

  }




  private buildWorkspaceInstanceName(
    workspaceId:string,
  ){

    const suffix =
      Date.now()
        .toString(36);


    return `imai-${workspaceId}-${suffix}`
      .toLowerCase()
      .replace(
        /[^a-z0-9-]/g,
        "-",
      );

  }




  private async destroyEvolutionInstance(
    instanceName:string,
  ){

    if(
      !env.EVOLUTION_API_KEY
    ){

      return;

    }


    for(const endpoint of [
      `/instance/logout/${encodeURIComponent(instanceName)}`,
      `/instance/delete/${encodeURIComponent(instanceName)}`,
    ]){

      try{

        await fetch(
          `${env.EVOLUTION_API_URL}${endpoint}`,
          {
            method:
              "DELETE",

            headers:{
              apikey:
                env.EVOLUTION_API_KEY,
            },
          },
        );

      }catch(error){

        console.error(
          "EVOLUTION_INSTANCE_DESTROY_FAILED:",
          endpoint,
          error,
        );

      }

    }

  }




  private async ensureEvolutionInstance(
    instanceName:string,
  ){

    if(
      !env.EVOLUTION_API_KEY
    ){

      return;

    }


    try{

      const response =
        await fetch(
          `${env.EVOLUTION_API_URL}/instance/create`,
          {
            method:
              "POST",

            headers:{
              apikey:
                env.EVOLUTION_API_KEY,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                instanceName,

                integration:
                  "WHATSAPP-BAILEYS",

                qrcode:
                  true,
              }),
          },
        );


      if(
        !response.ok
        &&
        response.status !== 400
        &&
        response.status !== 409
      ){

        console.error(
          "EVOLUTION_INSTANCE_CREATE_FAILED:",
          response.status,
          await response.text(),
        );

      }

    }catch(error){

      console.error(
        "EVOLUTION_INSTANCE_CREATE_FAILED:",
        error,
      );

    }


    await this.ensureEvolutionWebhook(
      instanceName,
    );

  }




  private async ensureEvolutionWebhook(
    instanceName:string,
  ){

    if(
      !env.EVOLUTION_API_KEY
      ||
      !env.WHATSAPP_WEBHOOK_SECRET
    ){

      return;

    }


    const publicApiUrl =
      this.getPublicApiUrl();


    if(!publicApiUrl){

      return;

    }


    const webhookUrl =
      `${publicApiUrl}/api/v1/whatsapp/evolution/webhook`;


    const webhookHeaders = {
      "X-MyPocket-Webhook-Secret":
        env.WHATSAPP_WEBHOOK_SECRET,
    };


    const basePayload = {
      url:
        webhookUrl,

      enabled:
        true,

      events:[
        "MESSAGES_UPSERT",
      ],

      webhookByEvents:
        false,

      webhookBase64:
        false,

      base64:
        false,

      headers:
        webhookHeaders,
    };


    const payloads:Array<Record<string, unknown>> = [
      {
        webhook:
          basePayload,
      },
      basePayload,
      {
        url:
          webhookUrl,

        enabled:
          true,

        events:[
          "MESSAGES_UPSERT",
        ],

        webhook_by_events:
          false,

        webhook_base64:
          false,

        base64:
          false,

        headers:
          webhookHeaders,
      },
    ];


    try{

      for(const payload of payloads){

        const response =
          await fetch(
            `${env.EVOLUTION_API_URL}/webhook/set/${encodeURIComponent(instanceName)}`,
            {
              method:
                "POST",

              headers:{
                apikey:
                  env.EVOLUTION_API_KEY,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );


        if(response.ok){

          return;

        }


        console.error(
          "EVOLUTION_WEBHOOK_SET_FAILED:",
          response.status,
          await response.text(),
        );

      }

    }catch(error){

      console.error(
        "EVOLUTION_WEBHOOK_SET_FAILED:",
        error,
      );

    }

  }




  private getPublicApiUrl(){

    if(env.GOOGLE_AUTH_REDIRECT_URI){

      try{

        return new URL(
          env.GOOGLE_AUTH_REDIRECT_URI,
        ).origin;

      }catch{

        return null;

      }

    }


    return null;

  }




  async registerDevInstance(
    input:WhatsAppDevInstanceInput,
  ){

    return this.app.prisma.whatsAppInstance
      .upsert({

        where:{
          instanceName:
            input.instanceName,
        },

        create:{
          instanceName:
            input.instanceName,

          phoneNumber:
            input.phoneNumber,

          status:
            "DEV_CONNECTED",

          workspaceId:
            input.workspaceId,
        },

        update:{
          phoneNumber:
            input.phoneNumber,

          status:
            "DEV_CONNECTED",

          workspaceId:
            input.workspaceId,
        },

      });

  }





  async updateWorkspaceWhatsAppBotAlias(
    input:{
      actorUserId:string;

      workspaceId:string;

      botAlias:string;
    },
  ){

    const actorMember =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            userId:
              input.actorUserId,
          },
        });


    if(
      !actorMember
      ||
      (
        actorMember.role !== "OWNER"
        &&
        actorMember.role !== "ADMIN"
      )
    ){

      throw new AppError(
        "WHATSAPP_BOT_ALIAS_FORBIDDEN",
        "Only Owner/Admin can update WhatsApp bot alias",
        403,
      );

    }


    const botAlias =
      input.botAlias
        .trim()
        .replace(
          /^@+/,
          "",
        )
        .toLowerCase();


    if(
      botAlias.length < 2
      ||
      botAlias.length > 32
      ||
      !/^[a-z0-9._-]+$/.test(
        botAlias,
      )
    ){

      throw new AppError(
        "WHATSAPP_BOT_ALIAS_INVALID",
        "Bot alias must contain 2 to 32 letters, numbers, dot, underscore or dash",
        400,
      );

    }


    const instance =
      await this.getOrCreateWorkspaceWhatsAppInstance(
        input.workspaceId,
      );


    const updated =
      await this.app.prisma.whatsAppInstance
        .update({
          where:{
            id:
              instance.id,
          },

          data:{
            botAlias,
          },

          select:{
            id:true,

            instanceName:true,

            botAlias:true,

            updatedAt:true,
          },
        });


    return {
      message:
        "WhatsApp bot alias updated",

      botAlias:
        updated.botAlias,

      groupTrigger:
        `@${updated.botAlias}`,

      instance:{
        id:
          updated.id,

        instanceName:
          updated.instanceName,

        updatedAt:
          updated.updatedAt,
      },
    };

  }





  async getWorkspaceWhatsAppStatus(
    input:{
      actorUserId:string;

      workspaceId:string;
    },
  ){

    const actorMember =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            userId:
              input.actorUserId,
          },

          include:{
            user:true,
          },
        });


    if(!actorMember){

      throw new AppError(
        "WHATSAPP_STATUS_FORBIDDEN",
        "Only workspace members can view WhatsApp status",
        403,
      );

    }


    const workspace =
      await this.app.prisma.workspace
        .findUnique({
          where:{
            id:
              input.workspaceId,
          },

          select:{
            id:true,
            name:true,
            type:true,
          },
        });


    if(!workspace){

      throw new AppError(
        "WORKSPACE_NOT_FOUND",
        "Workspace not found",
        404,
      );

    }


    const canManageInstance =
      actorMember.role === "OWNER"
      ||
      actorMember.role === "ADMIN";


    const instance =
      canManageInstance
        ?
        await this.getOrCreateWorkspaceWhatsAppInstance(
          input.workspaceId,
        )
        :
        await this.app.prisma.whatsAppInstance
          .findFirst({
            where:{
              workspaceId:
                input.workspaceId,
            },

            orderBy:{
              updatedAt:
                "desc",
            },
          });

    const refreshedInstance =
      instance
        ?
        await this.refreshWorkspaceInstanceStatus(
          instance,
        )
        :
        null;


    const members =
      await this.app.prisma.workspaceMember
        .findMany({
          where:{
            workspaceId:
              input.workspaceId,
          },

          select:{
            whatsappPhoneNumber:true,
          },
        });


    const total =
      members.length;


    const linked =
      members
        .filter(
          (member) => Boolean(
            member.whatsappPhoneNumber,
          ),
        )
        .length;


    return {
      workspace:{
        id:
          workspace.id,

        name:
          workspace.name,

        type:
          workspace.type,
      },

      instance:
        refreshedInstance
          ?
          {
            id:
              refreshedInstance.id,

            instanceName:
              refreshedInstance.instanceName,

            botAlias:
              instance?.botAlias
              ??
              "mypocket",

            phoneNumber:
              refreshedInstance.phoneNumber,

            status:
              refreshedInstance.status,

            updatedAt:
              refreshedInstance.updatedAt,
          }
          :
          null,

      memberMapping:{
        total,

        linked,

        unlinked:
          total - linked,
      },
    };

  }





  private async refreshWorkspaceInstanceStatus(
    instance:{
      id:string;
      instanceName:string;
      phoneNumber:string | null;
      status:string;
      updatedAt:Date;
    },
  ){

    const evolutionState =
      await this.getEvolutionConnectionState(
        instance.instanceName,
      );


    if(!evolutionState){

      return instance;

    }


    const status =
      this.normalizeEvolutionConnectionStatus(
        evolutionState,
      );


    if(status === "CONNECTED"){

      await this.ensureEvolutionWebhook(
        instance.instanceName,
      );

    }


    if(status === instance.status){

      return instance;

    }


    return this.app.prisma.whatsAppInstance
      .update({
        where:{
          id:
            instance.id,
        },

        data:{
          status,
        },
      });

  }





  private isConnectedWhatsAppStatus(
    status:string,
  ){

    return [
      "OPEN",
      "CONNECTED",
      "DEV_CONNECTED",
    ].includes(
      status
        .trim()
        .toUpperCase(),
    );

  }




  private normalizeEvolutionConnectionStatus(
    state:string,
  ){

    const normalized =
      state
        .trim()
        .toLowerCase();


    if(
      [
        "open",
        "connected",
        "connection_open",
      ].includes(
        normalized,
      )
    ){

      return "CONNECTED";

    }


    if(
      [
        "connecting",
        "qr",
        "qrcode",
        "pairing",
      ].includes(
        normalized,
      )
    ){

      return "PENDING_PAIRING";

    }


    if(
      [
        "close",
        "closed",
        "disconnected",
        "offline",
      ].includes(
        normalized,
      )
    ){

      return "OFFLINE";

    }


    return state
      .toUpperCase();

  }




  private async getEvolutionConnectionState(
    instanceName:string,
  ){

    if(!env.EVOLUTION_API_KEY){

      return "";

    }


    try{

      const response =
        await fetch(
          `${env.EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(instanceName)}`,
          {
            headers:{
              apikey:
                env.EVOLUTION_API_KEY,
            },
          },
        );


      if(!response.ok){

        return "";

      }


      const data =
        await response.json() as Record<string, unknown>;

      return (
        this.asString(
          this.asRecord(
            data.instance,
          ).state,
        )
        ||
        this.asString(
          data.state,
        )
        ||
        this.asString(
          data.status,
        )
      );

    }catch(error){

      console.error(
        "EVOLUTION_CONNECTION_STATE_FAILED:",
        error,
      );

      return "";

    }

  }




  private async isSuperAdminUserId(
    userId:string,
  ){

    const user =
      await this.app.prisma.user
        .findUnique({
          where:{
            id:
              userId,
          },

          select:{
            email:
              true,
          },
        });


    return isSuperAdminEmail(
      user?.email,
    );

  }





  async listWorkspaceWhatsAppMembers(
    input:{
      actorUserId:string;

      workspaceId:string;
    },
  ){

    const actorMember =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            userId:
              input.actorUserId,
          },

          include:{
            user:true,
          },
        });


    if(
      !actorMember
      ||
      (
        actorMember.role !== "OWNER"
        &&
        actorMember.role !== "ADMIN"
        &&
        !await this.isSuperAdminUserId(
          input.actorUserId,
        )
      )
    ){

      throw new AppError(
        "WHATSAPP_MEMBER_LIST_FORBIDDEN",
        "Only Owner/Admin can list WhatsApp member mapping",
        403,
      );

    }


    const members =
      await this.app.prisma.workspaceMember
        .findMany({
          where:{
            workspaceId:
              input.workspaceId,
          },

          orderBy:{
            createdAt:
              "asc",
          },

          include:{
            user:{
              select:{
                id:true,
                email:true,
                name:true,
              },
            },
          },
        });


    return members
      .map(
        (member) => ({
          memberId:
            member.id,

          userId:
            member.userId,

          email:
            member.user.email,

          name:
            member.user.name,

          role:
            member.role,

          whatsappPhoneNumber:
            member.whatsappPhoneNumber,
        }),
      );

  }





  async unlinkWorkspaceMemberPhone(
    input:{
      actorUserId:string;

      workspaceId:string;

      memberId:string;
    },
  ){

    const actorMember =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            userId:
              input.actorUserId,
          },
        });


    if(
      !actorMember
      ||
      (
        actorMember.role !== "OWNER"
        &&
        actorMember.role !== "ADMIN"
        &&
        !await this.isSuperAdminUserId(
          input.actorUserId,
        )
      )
    ){

      throw new AppError(
        "WHATSAPP_MEMBER_UNLINK_FORBIDDEN",
        "Only Owner/Admin can unlink WhatsApp member phone",
        403,
      );

    }


    const member =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            id:
              input.memberId,

            workspaceId:
              input.workspaceId,
          },

          include:{
            user:{
              select:{
                id:true,
                email:true,
                name:true,
              },
            },
          },
        });


    if(!member){

      throw new AppError(
        "WHATSAPP_MEMBER_NOT_FOUND",
        "Workspace member not found",
        404,
      );

    }


    const updated =
      await this.app.prisma.workspaceMember
        .update({
          where:{
            id:
              member.id,
          },

          data:{
            whatsappPhoneNumber:
              null,
          },

          include:{
            user:{
              select:{
                id:true,
                email:true,
                name:true,
              },
            },
          },
        });


    return {
      memberId:
        updated.id,

      userId:
        updated.userId,

      email:
        updated.user.email,

      name:
        updated.user.name,

      role:
        updated.role,

      whatsappPhoneNumber:
        updated.whatsappPhoneNumber,
    };

  }





  async linkWorkspaceMemberPhone(
    input:{
      actorUserId:string;

      workspaceId:string;

      email:string;

      phoneNumber:string;
    },
  ){

    const actorMember =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            userId:
              input.actorUserId,
          },
        });


    if(
      !actorMember
      ||
      (
        actorMember.role !== "OWNER"
        &&
        actorMember.role !== "ADMIN"
      )
    ){

      throw new AppError(
        "WHATSAPP_MEMBER_LINK_FORBIDDEN",
        "Only Owner/Admin can link WhatsApp member phone",
        403,
      );

    }


    const workspace =
      await this.app.prisma.workspace
        .findUnique({
          where:{
            id:
              input.workspaceId,
          },
        });


    if(!workspace){

      throw new AppError(
        "WORKSPACE_NOT_FOUND",
        "Workspace not found",
        404,
      );

    }


    if(workspace.type === "PERSONAL"){

      throw new AppError(
        "WHATSAPP_MEMBER_LINK_NOT_AVAILABLE_FOR_PERSONAL",
        "WhatsApp member linking is only available for Family and Business workspaces",
        400,
      );

    }


    const phoneNumber =
      this.normalizeWhatsAppPhoneNumber(
        input.phoneNumber,
      );


    if(phoneNumber.length < 8){

      throw new AppError(
        "WHATSAPP_PHONE_NUMBER_INVALID",
        "WhatsApp phone number is invalid",
        400,
      );

    }


    const user =
      await this.app.prisma.user
        .findUnique({
          where:{
            email:
              input.email,
          },
        });


    if(!user){

      throw new AppError(
        "WHATSAPP_MEMBER_USER_NOT_FOUND",
        "User email not found",
        404,
      );

    }


    const member =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            userId:
              user.id,
          },
        });


    if(!member){

      throw new AppError(
        "WHATSAPP_MEMBER_NOT_FOUND",
        "User is not a member of this workspace",
        404,
      );

    }


    const existingPhoneMember =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId:
              input.workspaceId,

            whatsappPhoneNumber:
              phoneNumber,
          },
        });


    if(
      existingPhoneMember
      &&
      existingPhoneMember.id !== member.id
    ){

      throw new AppError(
        "WHATSAPP_PHONE_NUMBER_ALREADY_LINKED",
        "WhatsApp phone number is already linked to another member",
        409,
      );

    }


    const updated =
      await this.app.prisma.workspaceMember
        .update({
          where:{
            id:
              member.id,
          },

          data:{
            whatsappPhoneNumber:
              phoneNumber,
          },

          include:{
            user:{
              select:{
                id:true,
                email:true,
                name:true,
              },
            },
          },
        });


    return {
      id:
        updated.id,

      workspaceId:
        updated.workspaceId,

      userId:
        updated.userId,

      role:
        updated.role,

      whatsappPhoneNumber:
        updated.whatsappPhoneNumber,

      user:
        updated.user,
    };

  }





  async createDevTransaction(
    input:WhatsAppDevTransactionInput,
  ){

    const parsed =
      this.parseTransactionText(
        input.text,
        input.transactionDate,
        input.currency,
      );


    const category =
      await this.findOrCreateCategory(
        input.user.workspaceId,
        parsed.categoryName,
      );


    const merchant =
      parsed.merchantName
        ?
        await this.findOrCreateMerchant(
          input.user.workspaceId,
          parsed.merchantName,
        )
        :
        null;


    const paymentMethod =
      parsed.paymentMethodName
        ?
        await this.findOrCreatePaymentMethod(
          input.user.workspaceId,
          parsed.paymentMethodName,
        )
        :
        null;


    const transaction =
      await this.transactionService
        .createTransaction(
          input.user.role,
          {

            workspaceId:
              input.user.workspaceId,

            createdById:
              input.user.userId,

            amount:
              parsed.amount,

            currency:
              parsed.currency,

            type:
              parsed.type,

            description:
              parsed.description,

            transactionDate:
              new Date(
                parsed.transactionDate,
              ),

            categoryId:
              category.id,

            merchantId:
              merchant?.id,

            paymentMethodId:
              paymentMethod?.id,

            source:
              input.source
              ??
              "SYSTEM",

          },
        );


    return {

      message:
        "WhatsApp dev transaction recorded",

      source:
        "WHATSAPP_DEV",

      parsed,

      transaction,

    };

  }





  async handleEvolutionWebhook(
    payload:unknown,
  ){

    const normalized =
      this.normalizeEvolutionPayload(
        payload,
      );


    if(!normalized.accepted){

      return {

        message:
          "WhatsApp webhook ignored",

        source:
          "EVOLUTION",

        normalized,

      };

    }


    const instance =
      await this.app.prisma.whatsAppInstance
        .findUnique({
          where:{
            instanceName:
              normalized.instanceName!,
          },
        });


    if(!instance){

      return {

        message:
          "WhatsApp webhook ignored",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            "WHATSAPP_INSTANCE_NOT_REGISTERED",
        },

      };

    }


    const isGroupMessage =
      normalized.remoteJid
        ?.endsWith(
          "@g.us",
        )
      ??
      false;


    if(isGroupMessage){

      const originalText =
        (
          normalized.text
          ??
          ""
        )
          .trim();


      const botAlias =
        instance.botAlias
          .trim()
          .replace(
            /^@+/,
            "",
          )
          .toLowerCase();


      const aliasToken =
        botAlias
          ?
          `@${botAlias}`
          :
          "";


      const lowerText =
        originalText
          .toLowerCase();


      let triggeredText:
        | string
        | null =
          null;


      if(
        originalText.startsWith(
          "!",
        )
      ){

        triggeredText =
          originalText
            .slice(
              1,
            )
            .trim();

      }
      else if(
        aliasToken
        &&
        (
          lowerText.startsWith(
            `${aliasToken} `,
          )
          ||
          lowerText.startsWith(
            `${aliasToken},`,
          )
          ||
          lowerText.startsWith(
            `${aliasToken}:`,
          )
        )
      ){

        triggeredText =
          originalText
            .slice(
              aliasToken.length,
            )
            .replace(
              /^[\s,:]+/,
              "",
            )
            .trim();

      }


      if(!triggeredText){

        return {

          message:
            "WhatsApp webhook ignored",

          source:
            "EVOLUTION",

          normalized:{
            ...normalized,

            reason:
              "GROUP_TRIGGER_REQUIRED",
          },

        };

      }


      normalized.text =
        triggeredText;

    }


    if(
      WhatsAppCommandParser
        .isHelp(
          normalized.text
          ??
          "",
        )
    ){

      const replyLanguage =
        await this.getWorkspaceReplyLanguage(
          instance.workspaceId,
        );

      await this.safeSendWebhookReply(
        normalized,
        this.buildHelpReply(
          instance.botAlias
          ??
          "mypocket",
          replyLanguage,
        ),
      );


      return {

        message:
          "WhatsApp help sent",

        source:
          "EVOLUTION",

        normalized,

      };

    }


    const isUndo =
      WhatsAppCommandParser
        .isUndo(
          normalized.text
          ??
          "",
        );


    const summaryPeriod =
      WhatsAppCommandParser
        .summaryPeriod(
          normalized.text
          ??
          "",
        );


    const isStatus =
      WhatsAppCommandParser
        .isStatus(
          normalized.text
          ??
          "",
        );


    const isWhoami =
      WhatsAppCommandParser
        .isWhoami(
          normalized.text
          ??
          "",
        );


    const isLast =
      WhatsAppCommandParser
        .isLast(
          normalized.text
          ??
          "",
        );


    const editCommand =
      WhatsAppCommandParser
        .editLast(
          normalized.text
          ??
          "",
        );


    const isCategories =
      WhatsAppCommandParser
        .isCategories(
          normalized.text
          ??
          "",
        );


    const isMembers =
      WhatsAppCommandParser
        .isMembers(
          normalized.text
          ??
          "",
        );


    const infoCommand =
      WhatsAppCommandParser
        .info(
          normalized.text
          ??
          "",
        );


    const listCommand =
      WhatsAppCommandParser
        .list(
          normalized.text
          ??
          "",
        );


    const reminderCommand =
      this.parseReminderCommand(
        normalized.text
        ??
        "",
      );


    const commandKind =
      this.resolveWebhookCommandKind({
        editCommand,
        isUndo,
        isStatus,
        isWhoami,
        isLast,
        isCategories,
        isMembers,
        infoCommand,
        listCommand,
        reminderCommand,
        summaryPeriod,
      });


    const actorRemoteJidIsGroup =
      (
        normalized.remoteJid
        ??
        ""
      )
        .toLowerCase()
        .endsWith(
          "@g.us",
        );


    const actorJid =
      actorRemoteJidIsGroup
        ?
        (
          normalized.participantJid
          ??
          normalized.remoteJid
        )
        :
        (
          normalized.remoteJid
          ??
          normalized.participantJid
        );


    const actorMember =
      await this.findWebhookActorMember(
        instance.workspaceId,
        actorJid,
      );


    if(!actorMember){

      await this.safeSendWebhookReply(
        normalized,
        [
          "🔒 Nombor WhatsApp ini belum dipautkan kepada ahli workspace.",
          "Hubungi Owner/Admin untuk link nombor dahulu.",
        ].join(
          "\n",
        ),
      );


      return {

        message:
          "WhatsApp webhook ignored",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            "WHATSAPP_MEMBER_PHONE_NOT_LINKED",
        },

      };

    }


    if(
      !this.canUseWhatsAppCommand(
        actorMember.role,
        commandKind,
      )
    ){

      await this.safeSendWebhookReply(
        normalized,
        this.buildCommandNotAllowedReply(
          commandKind,
        ),
      );


      return {

        message:
          "WhatsApp command blocked",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            "WHATSAPP_COMMAND_NOT_ALLOWED",
        },

        commandKind,

        role:
          actorMember.role,

      };

    }


    if(editCommand){

      return this.handleEditLastCommand(
        instance.workspaceId,
        normalized,
        actorMember.userId,
        actorMember.role,
        editCommand,
      );

    }


    if(isUndo){

      return this.handleUndoCommand(
        instance.workspaceId,
        normalized,
      );

    }


    if(isStatus){

      return this.handleStatusCommand(
        instance.workspaceId,
        normalized,
        instance.instanceName,
      );

    }


    if(isWhoami){

      return this.handleWhoamiCommand(
        instance.workspaceId,
        normalized,
        actorMember.userId,
      );

    }


    if(isLast){

      return this.handleLastCommand(
        instance.workspaceId,
        normalized,
        actorMember.userId,
        actorMember.role,
      );

    }


    if(isCategories){

      return this.handleCategoriesCommand(
        normalized,
      );

    }


    if(isMembers){

      return this.handleMembersCommand(
        instance.workspaceId,
        normalized,
      );

    }


    if(infoCommand){

      return this.handleInfoCommand(
        normalized,
        infoCommand,
      );

    }


    if(reminderCommand){

      return this.handleReminderCommand(
        instance.workspaceId,
        normalized,
        actorMember.userId,
        actorMember.role,
        reminderCommand,
      );

    }


    if(listCommand){

      return this.handleListCommand(
        instance.workspaceId,
        normalized,
        listCommand,
        actorMember.userId,
        actorMember.role,
      );

    }


    if(summaryPeriod){

      return this.handleSummaryCommand(
        instance.workspaceId,
        normalized,
        summaryPeriod,
        actorMember.userId,
        actorMember.role,
      );

    }


    const parseCheck =
      await this.safeParseWebhookTransaction(
        normalized,
      );


    if(!parseCheck.parsed){

      return {

        message:
          "WhatsApp webhook parse failed",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            parseCheck.reason,
        },

      };

    }


    const duplicate =
      await this.findDuplicateTransaction(
        instance.workspaceId,
        normalized.text!,
        normalized.timestamp,
      );


    if(duplicate){

      await this.safeSendWebhookReply(
        normalized,
        "ℹ️ Transaksi ini sudah direkod sebelum ini.",
      );


      return {

        message:
          "WhatsApp webhook duplicate ignored",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            "WHATSAPP_DUPLICATE_TRANSACTION",
        },

        transaction:
          duplicate,

      };

    }


    const result =
      await this.createDevTransaction({

        text:
          normalized.text!,

        transactionDate:
          normalized.timestamp,

        source:
          "WHATSAPP",

        user:{
          userId:
            actorMember.userId,

          workspaceId:
            instance.workspaceId,

          role:
            actorMember.role,
        },

      });


    await this.safeSendWebhookReply(
      normalized,
      this.buildTransactionReply(
        result.parsed,
      ),
    );


    return {

      message:
        "WhatsApp webhook transaction recorded",

      source:
        "EVOLUTION",

      normalized,

      parsed:
        result.parsed,

      transaction:
        result.transaction,

    };

  }





  private async findWebhookActorMember(
    workspaceId:string,

    remoteJid?:string,
  ){

    const workspace =
      await this.app.prisma.workspace
        .findUnique({
          where:{
            id:
              workspaceId,
          },

          select:{
            type:
              true,
          },
        });


    const phoneNumber =
      (
        remoteJid
        ??
        ""
      )
        .split("@")[0]
        .replace(
          /\D/g,
          "",
        );


    if(phoneNumber){

      const linkedMember =
        await this.app.prisma.workspaceMember
          .findFirst({
            where:{
              workspaceId,

              whatsappPhoneNumber:
                phoneNumber,
            },

            include:{
              user:
                true,
            },
          });


      if(linkedMember){

        return linkedMember;

      }

    }


    if(
      workspace?.type === "PERSONAL"
    ){

      return this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId,

            role:{
              in:[
                "OWNER",
                "ADMIN",
              ],
            },
          },

          orderBy:{
            createdAt:
              "asc",
          },

          include:{
            user:
              true,
          },
        });

    }


    return null;

  }






  private resolveWebhookCommandKind(
    input:{
      editCommand:
        | WhatsAppEditCommand
        | null;

      isUndo:boolean;

      isStatus:boolean;

      isWhoami:boolean;

      isLast:boolean;

      isCategories:boolean;

      isMembers:boolean;

      infoCommand:
        | "methods"
        | "commands"
        | null;

      listCommand:
        | WhatsAppListCommand
        | null;

      reminderCommand:
        | ReturnType<WhatsAppService["parseReminderCommand"]>
        | null;

      summaryPeriod:
        | "today"
        | "week"
        | "month"
        | null;
    },
  ):WhatsAppCommandKind{

    if(input.editCommand){

      return "edit";

    }


    if(input.isUndo){

      return "undo";

    }


    if(input.isStatus){

      return "status";

    }


    if(input.isWhoami){

      return "whoami";

    }


    if(input.isLast){

      return "last";

    }


    if(input.isCategories){

      return "categories";

    }


    if(input.isMembers){

      return "members";

    }


    if(input.infoCommand){

      return "info";

    }


    if(input.listCommand){

      return "list";

    }


    if(input.reminderCommand){

      return "reminder";

    }


    if(input.summaryPeriod){

      return "summary";

    }


    return "transaction";

  }





  private canUseWhatsAppCommand(
    role:
      | "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",

    commandKind:WhatsAppCommandKind,
  ){

    const readOnlyCommands:
      WhatsAppCommandKind[] =
        [
          "help",
          "info",
          "categories",
          "last",
          "status",
          "whoami",
          "summary",
          "list",
        ];


    if(
      role === "OWNER"
      ||
      role === "ADMIN"
    ){

      return true;

    }


    if(role === "MEMBER"){

      return [
        ...readOnlyCommands,
        "transaction",
        "reminder",
      ].includes(
        commandKind,
      );

    }


    return readOnlyCommands
      .includes(
        commandKind,
      );

  }





  private buildCommandNotAllowedReply(
    commandKind:WhatsAppCommandKind,
  ){

    if(
      commandKind === "edit"
      ||
      commandKind === "undo"
    ){

      return [
        "🔒 Command ini hanya untuk Owner/Admin.",
        "Jika perlu ubah transaksi, sila hubungi admin workspace.",
      ].join(
        "\n",
      );

    }


    if(commandKind === "members"){

      return [
        "🔒 Command members hanya untuk Owner/Admin.",
        "Sila hubungi admin workspace untuk semak atau link nombor WhatsApp.",
      ].join(
        "\n",
      );

    }


    if(commandKind === "reminder"){

      return [
        "🔒 Command reminder tidak dibenarkan untuk akaun anda.",
        "Sila hubungi admin workspace.",
      ].join(
        "\n",
      );

    }


    if(commandKind === "transaction"){

      return [
        "🔒 Akaun anda belum dibenarkan merekod transaksi.",
        "Sila hubungi admin workspace.",
      ].join(
        "\n",
      );

    }


    return [
      "🔒 Command ini tidak dibenarkan untuk akaun anda.",
      `Command: ${commandKind}`,
    ].join(
      "\n",
    );

  }






  private parseReminderCommand(
    text:string,
  ):
    | {
        action:
          | "list_unpaid"
          | "list_all"
          | "list_paid"
          | "create"
          | "update_due_day"
          | "deactivate"
          | "activate"
          | "archive"
          | "mark_paid";
        name?:string;
        amount?:string;
        dueDay?:number;
      }
    | null {

    const trimmed =
      text
        .trim();

    const normalized =
      trimmed
        .toLowerCase();

    if([
      "reminder",
      "reminders",
      "pending reminder",
      "pending reminders",
      "unpaid reminder",
      "unpaid reminders",
      "show reminders",
      "list reminders",
      "peringatan",
    ].includes(normalized)){
      return {
        action:
          "list_unpaid",
      };
    }

    if([
      "reminder semua",
      "all reminders",
      "all commitments",
      "list commitments",
      "commitments",
      "senarai komitmen",
      "komitmen",
    ].includes(normalized)){
      return {
        action:
          "list_all",
      };
    }

    if([
      "reminder selesai",
      "komitmen selesai",
      "paid reminder",
      "paid reminders",
      "completed reminder",
      "completed reminders",
      "done reminder",
      "done reminders",
    ].includes(normalized)){
      return {
        action:
          "list_paid",
      };
    }

    const createMatch =
      trimmed.match(
        /^(?:ingatkan|tambah\s+reminder|bil)\s+(.+?)\s+rm\s*([0-9]+(?:[.,][0-9]{1,2})?)\s+(?:setiap\s+)?([0-9]{1,2})\s*(?:hb|haribulan)?$/i,
      )
      ??
      trimmed.match(
        /^(?:remind\s+me(?:\s+to\s+pay)?|add\s+reminder|add\s+commitment|bill)\s+(.+?)\s+rm\s*([0-9]+(?:[.,][0-9]{1,2})?)\s+(?:(?:on|every|due)\s+)?(?:day\s*)?([0-9]{1,2})(?:st|nd|rd|th)?$/i,
      );

    if(createMatch){
      return {
        action:
          "create",
        name:
          createMatch[1].trim(),
        amount:
          createMatch[2].replace(
            ",",
            ".",
          ),
        dueDay:
          Number(createMatch[3]),
      };
    }

    const updateMatch =
      trimmed.match(
        /^ubah\s+reminder\s+(.+?)\s+ke\s+([0-9]{1,2})\s*(?:hb|haribulan)?$/i,
      )
      ??
      trimmed.match(
        /^(?:change|update|edit)\s+reminder\s+(.+?)\s+(?:to|on)\s+([0-9]{1,2})(?:st|nd|rd|th)?$/i,
      );

    if(updateMatch){
      return {
        action:
          "update_due_day",
        name:
          updateMatch[1].trim(),
        dueDay:
          Number(updateMatch[2]),
      };
    }

    const deactivateMatch =
      trimmed.match(
        /^(?:tutup|nyahaktifkan)\s+reminder\s+(.+)$/i,
      )
      ??
      trimmed.match(
        /^(?:turn\s+off|disable|deactivate)\s+reminder\s+(.+)$/i,
      );

    if(deactivateMatch){
      return {
        action:
          "deactivate",
        name:
          deactivateMatch[1].trim(),
      };
    }

    const activateMatch =
      trimmed.match(
        /^aktifkan\s+reminder\s+(.+)$/i,
      )
      ??
      trimmed.match(
        /^(?:enable|activate)\s+reminder\s+(.+)$/i,
      );

    if(activateMatch){
      return {
        action:
          "activate",
        name:
          activateMatch[1].trim(),
      };
    }

    const archiveMatch =
      trimmed.match(
        /^padam\s+komitmen\s+(.+)$/i,
      )
      ??
      trimmed.match(
        /^(?:delete|archive)\s+(?:commitment|reminder)\s+(.+)$/i,
      );

    if(archiveMatch){
      return {
        action:
          "archive",
        name:
          archiveMatch[1].trim(),
      };
    }

    const paidMatch =
      trimmed.match(
        /^(?:bayar|paid|selesai)\s+(?:reminder\s+|komitmen\s+)?(.+)$/i,
      )
      ??
      trimmed.match(
        /^(?:pay|done|complete|mark\s+paid)\s+(?:reminder\s+|commitment\s+)?(.+)$/i,
      );

    if(paidMatch){
      return {
        action:
          "mark_paid",
        name:
          paidMatch[1].trim(),
      };
    }

    return null;

  }




  private async getWorkspaceReplyLanguage(
    workspaceId:string,
  ):Promise<"ms" | "en">{

    const settings =
      await this.app.prisma.workspaceBotSettings.findUnique({
        where:{
          workspaceId,
        },
        select:{
          replyLanguage:true,
        },
      });

    return settings?.replyLanguage === "en"
      ? "en"
      : "ms";

  }




  private async handleReminderCommand(
    workspaceId:string,
    normalized:NormalizedEvolutionMessage,
    actorUserId:string,
    role:
      | "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",
    command:NonNullable<ReturnType<WhatsAppService["parseReminderCommand"]>>,
  ){

    const actor = {
      userId:
        actorUserId,
      workspaceId,
      role,
    };

    const replyLanguage =
      await this.getWorkspaceReplyLanguage(
        workspaceId,
      );

    if(command.action === "create"){
      if(!command.name || !command.amount || !command.dueDay){
        await this.safeSendWebhookReply(
          normalized,
          replyLanguage === "en"
            ? "Reminder format is incomplete. Example: Remind me to pay car RM1000 every 10th"
            : "Format reminder tidak lengkap. Contoh: Ingatkan bayaran kereta RM1000 setiap 10hb",
        );
        return {
          message:"WhatsApp reminder create invalid",
          source:"EVOLUTION",
          normalized,
        };
      }

      const result =
        await this.commitmentService.createCommitment(
          actor,
          {
            name:
              command.name,
            amount:
              command.amount,
            dueDay:
              command.dueDay,
          },
        );

      await this.safeSendWebhookReply(
        normalized,
        replyLanguage === "en"
          ? [
              "✅ Reminder added",
              "",
              `${result.name} — RM${result.amount} — every ${result.dueDay}${this.englishDaySuffix(result.dueDay)}`,
            ].join("\n")
          : [
              "✅ Reminder ditambah",
              "",
              `${result.name} — RM${result.amount} — setiap ${result.dueDay}hb`,
            ].join("\n"),
      );

      return {
        message:"WhatsApp reminder created",
        source:"EVOLUTION",
        normalized,
        commitment:result,
      };
    }

    if(command.action === "update_due_day"){
      const commitment =
        await this.findCommitmentByNameForWhatsApp(
          actor,
          command.name,
        );

      const result =
        await this.commitmentService.updateCommitment(
          actor,
          commitment.id,
          {
            dueDay:
              command.dueDay,
          },
        );

      await this.safeSendWebhookReply(
        normalized,
        replyLanguage === "en"
          ? `✅ Reminder ${result.name} updated to ${result.dueDay}${this.englishDaySuffix(result.dueDay)}.`
          : `✅ Reminder ${result.name} dikemas kini ke ${result.dueDay}hb.`,
      );

      return {
        message:"WhatsApp reminder updated",
        source:"EVOLUTION",
        normalized,
        commitment:result,
      };
    }

    if([
      "deactivate",
      "activate",
    ].includes(command.action)){
      const commitment =
        await this.findCommitmentByNameForWhatsApp(
          actor,
          command.name,
        );

      const active =
        command.action === "activate";

      const result =
        await this.commitmentService.updateCommitment(
          actor,
          commitment.id,
          {
            isActive:
              active,
          },
        );

      await this.safeSendWebhookReply(
        normalized,
        replyLanguage === "en"
          ? active
            ? `✅ Reminder ${result.name} activated.`
            : `✅ Reminder ${result.name} deactivated.`
          : active
            ? `✅ Reminder ${result.name} diaktifkan.`
            : `✅ Reminder ${result.name} dinyahaktifkan.`,
      );

      return {
        message:"WhatsApp reminder active state updated",
        source:"EVOLUTION",
        normalized,
        commitment:result,
      };
    }

    if(command.action === "archive"){
      const commitment =
        await this.findCommitmentByNameForWhatsApp(
          actor,
          command.name,
        );

      const result =
        await this.commitmentService.archiveCommitment(
          actor,
          commitment.id,
        );

      await this.safeSendWebhookReply(
        normalized,
        replyLanguage === "en"
          ? "✅ Commitment archived. Monthly history was not deleted."
          : "✅ Komitmen diarchive. Sejarah bulanan tidak dipadam.",
      );

      return {
        message:"WhatsApp reminder archived",
        source:"EVOLUTION",
        normalized,
        result,
      };
    }

    if(command.action === "mark_paid"){
      const commitment =
        await this.findCommitmentByNameForWhatsApp(
          actor,
          command.name,
        );

      const result =
        await this.commitmentService.markCurrentMonthPaid(
          actor,
          commitment.id,
        );

      await this.safeSendWebhookReply(
        normalized,
        replyLanguage === "en"
          ? "✅ Current month commitment marked as paid."
          : "✅ Komitmen bulan semasa ditanda sudah dibayar.",
      );

      return {
        message:"WhatsApp reminder paid",
        source:"EVOLUTION",
        normalized,
        result,
      };
    }

    const status =
      command.action === "list_all"
        ? "all"
        : command.action === "list_paid"
          ? "paid"
          : "unpaid";

    const result =
      await this.commitmentService.listCommitments(
        actor,
        status,
      );

    await this.safeSendWebhookReply(
      normalized,
      this.buildReminderListReply(
        result,
        replyLanguage,
      ),
    );

    return {
      message:"WhatsApp reminder list sent",
      source:"EVOLUTION",
      normalized,
      result,
    };

  }




  private async findCommitmentByNameForWhatsApp(
    actor:{
      userId:string;
      workspaceId:string;
      role:string;
    },
    name?:string,
  ){

    if(!name){
      throw new AppError(
        "REMINDER_NAME_REQUIRED",
        "Reminder name is required",
        400,
      );
    }

    const result =
      await this.commitmentService.listCommitments(
        actor,
        "all",
      );

    const normalizedName =
      name
        .trim()
        .toLowerCase();

    const matches =
      result.items.filter((item:any) =>
        item.name
          .toLowerCase()
          .includes(
            normalizedName,
          )
      );

    if(matches.length !== 1){
      throw new AppError(
        "REMINDER_NOT_FOUND_OR_AMBIGUOUS",
        matches.length === 0
          ? "Reminder not found"
          : "Reminder name is ambiguous",
        404,
      );
    }

    return matches[0];

  }




  private buildReminderListReply(
    result:any,
    language:"ms" | "en" = "ms",
  ){

    const isEnglish =
      language === "en";

    const title =
      isEnglish
        ? result.filter === "paid"
          ? `✅ Completed commitments — ${result.period.label}`
          : result.filter === "all"
            ? `📋 All commitments — ${result.period.label}`
            : `🔔 Unpaid commitments — ${result.period.label}`
        : result.filter === "paid"
          ? `✅ Komitmen selesai — ${result.period.label}`
          : result.filter === "all"
            ? `📋 Semua komitmen — ${result.period.label}`
            : `🔔 Komitmen belum dibayar — ${result.period.label}`;

    if(!result.items.length){
      return [
        title,
        "",
        isEnglish
          ? "No records for this view."
          : "Tiada rekod untuk paparan ini.",
      ].join("\n");
    }

    const lines =
      result.items.map((item:any) => {
        const dueDate =
          new Date(
            item.currentMonth.dueDate,
          );
        const icon =
          item.currentMonth.status === "PAID"
            ? "✅"
            : item.currentMonth.status === "OVERDUE"
              ? "⚠️"
              : "⬜";
        return `${icon} ${item.name} — RM${Number(item.amount).toLocaleString("ms-MY")} — ${dueDate.getDate()} ${result.period.label.split(" ")[0]}`;
      });

    return [
      title,
      "",
      ...lines,
      "",
      isEnglish
        ? `Total unpaid: RM${Number(result.summary.totalUnpaid).toLocaleString("ms-MY")}`
        : `Jumlah belum dibayar: RM${Number(result.summary.totalUnpaid).toLocaleString("ms-MY")}`,
    ].join("\n");

  }




  private englishDaySuffix(
    day:number,
  ){

    if(day >= 11 && day <= 13){
      return "th";
    }

    const lastDigit =
      day % 10;

    if(lastDigit === 1){
      return "st";
    }

    if(lastDigit === 2){
      return "nd";
    }

    if(lastDigit === 3){
      return "rd";
    }

    return "th";

  }




  private async handleInfoCommand(
    normalized:NormalizedEvolutionMessage,

    command:
      | "methods"
      | "commands",
  ){

    const reply =
      command === "methods"
        ?
        this.buildMethodsReply()
        :
        this.buildCommandsReply();


    await this.safeSendWebhookReply(
      normalized,
      reply,
    );


    return {

      message:
        "WhatsApp info command sent",

      source:
        "EVOLUTION",

      normalized,

      command,

    };

  }





  private buildMethodsReply(){

    return WhatsAppReplyBuilder
      .methods();

  }





  private buildCommandsReply(){

    return WhatsAppReplyBuilder
      .commands();

  }





  private async handleMembersCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,
  ){

    const members =
      await this.app.prisma.workspaceMember
        .findMany({
          where:{
            workspaceId,
          },

          orderBy:{
            createdAt:
              "asc",
          },

          include:{
            user:{
              select:{
                email:true,
                name:true,
              },
            },
          },
        });


    await this.safeSendWebhookReply(
      normalized,
      WhatsAppReplyBuilder
        .members(
          members
            .map(
              (member) => ({
                name:
                  member.user.name,

                email:
                  member.user.email,

                role:
                  member.role,

                whatsappPhoneNumber:
                  member.whatsappPhoneNumber,
              }),
            ),
        ),
    );


    return {
      message:
        "WhatsApp members command sent",

      source:
        "EVOLUTION",

      normalized,

      members:
        members.length,
    };

  }





  private async handleCategoriesCommand(
    normalized:NormalizedEvolutionMessage,
  ){

    const reply =
      [
        "🏷️ Kategori auto MyPocket",
        "",
        "• Food — makan, minum, kopi, nasi",
        "• Transport — petrol, grab, tol, parking",
        "• Bills — bill, elektrik, air, internet",
        "• Shopping — belanja, beli, shopee, lazada",
        "• Rent — rent, sewa",
        "• Salary — gaji, bonus, income, terima, refund",
        "• Others — fallback",
      ].join(
        "\n",
      );


    await this.safeSendWebhookReply(
      normalized,
      reply,
    );


    return {

      message:
        "WhatsApp categories sent",

      source:
        "EVOLUTION",

      normalized,

    };

  }





  private async getWorkspaceSheetTransactions(
    workspaceId:string,
    actor?:{
      userId:string;
      role:string;
    },
  ){

    const transactions =
      await this.transactionService
        .getSheetTransactions(
          workspaceId,
          actor,
        );


    return (
      transactions as Array<any>
    )
      .filter(Boolean)
      .map(
        (transaction) => ({
          ...transaction,

          transactionDate:
            new Date(
              transaction.transactionDate,
            ),
        }),
      )
      .sort(
        (first, second) => this.getSheetTransactionTime(
          second,
        )
        -
        this.getSheetTransactionTime(
          first,
        ),
      );

  }





  private getSheetTransactionTime(
    transaction:any,
  ){

    const timestamp =
      new Date(
        transaction.transactionDate,
      )
        .getTime();


    return Number.isFinite(
      timestamp,
    )
      ? timestamp
      : 0;

  }





  private isSheetTransactionInRange(
    transaction:any,

    start:Date,

    end:Date,
  ){

    const timestamp =
      this.getSheetTransactionTime(
        transaction,
      );


    return (
      timestamp >= start.getTime()
      &&
      timestamp <= end.getTime()
    );

  }





  private sheetTransactionMatchesKeyword(
    transaction:any,

    keyword:string,
  ){

    const needle =
      keyword
        .trim()
        .toLowerCase();


    if(!needle){

      return true;

    }


    return [
      transaction.description,
      transaction.category?.name,
      transaction.merchant?.name,
      transaction.paymentMethod?.name,
      transaction.source,
      transaction.type,
      transaction.amount,
    ]
      .filter(Boolean)
      .some(
        (value) => String(
          value,
        )
          .toLowerCase()
          .includes(
            needle,
          ),
      );

  }





  private async handleLastCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,

    actorUserId:string,

    actorRole:string,
  ){

    const transaction =
      (
        await this.getWorkspaceSheetTransactions(
          workspaceId,
          {
            userId:
              actorUserId,

            role:
              actorRole,
          },
        )
      )[0]
      ??
      null;


    const reply =
      transaction
        ?
        this.buildLastReply(
          transaction,
        )
        :
        "ℹ️ Tiada transaksi aktif ditemui.";


    await this.safeSendWebhookReply(
      normalized,
      reply,
    );


    return {

      message:
        "WhatsApp last transaction sent",

      source:
        "EVOLUTION",

      normalized,

      transaction,

    };

  }





  private buildLastReply(
    transaction:{
      amount:unknown;
      currency:string;
      type:string;
      description:string | null;
      transactionDate:Date;
      category?:{
        name:string;
      } | null;
      merchant?:{
        name:string;
      } | null;
      paymentMethod?:{
        name:string;
      } | null;
    },
  ){

    const category =
      transaction.category?.name
      ??
      "Others";


    const merchant =
      transaction.merchant?.name
        ?
        ` @ ${transaction.merchant.name}`
        :
        "";


    const paymentMethod =
      transaction.paymentMethod?.name
        ?
        ` (${transaction.paymentMethod.name})`
        :
        "";


    return [
      "🧾 Transaksi terakhir",
      `${transaction.type}: ${category}${merchant}${paymentMethod}`,
      `${transaction.currency}${transaction.amount}`,
      transaction.description
        ??
        "",
    ].filter(Boolean)
      .join(
        "\n",
      );

  }





  private async handleWhoamiCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,

    userId:string,
  ){

    const member =
      await this.app.prisma.workspaceMember
        .findFirst({
          where:{
            workspaceId,

            userId,
          },

          include:{
            user:{
              select:{
                email:true,
                name:true,
              },
            },

            workspace:{
              select:{
                name:true,
                type:true,
              },
            },
          },
        });


    if(!member){

      await this.safeSendWebhookReply(
        normalized,
        "⚠️ Identity WhatsApp tidak dijumpai.",
      );


      return {
        message:
          "WhatsApp whoami not found",

        source:
          "EVOLUTION",

        normalized,
      };

    }


    await this.safeSendWebhookReply(
      normalized,
      WhatsAppReplyBuilder
        .whoami({
          workspaceName:
            member.workspace.name,

          workspaceType:
            member.workspace.type,

          role:
            member.role,

          name:
            member.user.name,

          email:
            member.user.email,

          whatsappPhoneNumber:
            member.whatsappPhoneNumber,
        }),
    );


    return {
      message:
        "WhatsApp whoami command sent",

      source:
        "EVOLUTION",

      normalized,
    };

  }





  private async handleStatusCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,

    instanceName:string,
  ){

    const setting =
      await this.app.prisma.workspaceGoogleSetting
        .findUnique({
          where:{
            workspaceId,
          },
        });


    const workspace =
      await this.app.prisma.workspace
        .findUnique({
          where:{
            id:
              workspaceId,
          },
        });


    const reply =
      [
        "✅ MyPocket AI aktif",
        `WhatsApp: ${instanceName}`,
        `Workspace: ${workspace?.type ?? "-"}`,
        `Google Sheet: ${setting ? "connected" : "not connected"}`,
        `Timezone: ${env.DEFAULT_TIMEZONE}`,
      ].join(
        "\n",
      );


    await this.safeSendWebhookReply(
      normalized,
      reply,
    );


    return {

      message:
        "WhatsApp status sent",

      source:
        "EVOLUTION",

      normalized,

      status:{
        workspaceId,
        instanceName,
        googleSheetConnected:
          Boolean(setting),
        timezone:
          env.DEFAULT_TIMEZONE,
      },

    };

  }





  private async handleListCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,

    command:WhatsAppListCommand,

    actorUserId:string,

    actorRole:string,
  ){

    const now =
      new Date();


    let title =
      "📋 Senarai transaksi";

    let transactions =
      await this.getWorkspaceSheetTransactions(
        workspaceId,
        {
          userId:
            actorUserId,

          role:
            actorRole,
        },
      );


    if(command.mode === "search"){

      const keyword =
        command.keyword
        ??
        "";


      title =
        `🔎 Carian transaksi: ${keyword}`;


      transactions =
        transactions
          .filter(
            (transaction) => this.sheetTransactionMatchesKeyword(
              transaction,
              keyword,
            ),
          )
          .slice(
            0,
            5,
          );

    }else{

      const period =
        command.period
        ??
        "today";


      const periodRange =
        this.getTimezonePeriodRange(
          now,
          env.DEFAULT_TIMEZONE,
          period,
        );


      title =
        period === "today"
          ?
          "📋 Transaksi hari ini"
          :
          period === "week"
            ?
            "📋 Transaksi minggu ini"
            :
            "📋 Transaksi bulan ini";


      transactions =
        transactions
          .filter(
            (transaction) => this.isSheetTransactionInRange(
              transaction,
              periodRange.start,
              periodRange.end,
            ),
          )
          .slice(
            0,
            5,
          );

    }


    const reply =
      WhatsAppReplyBuilder
        .transactionList(
          transactions,
          title,
        );


    await this.safeSendWebhookReply(
      normalized,
      reply,
    );


    return {
      message:
        "WhatsApp list command sent",

      source:
        "EVOLUTION",

      normalized,

      command,

      count:
        transactions.length,
    };

  }





  private async handleSummaryCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,

    period:
      | "today"
      | "week"
      | "month",

    actorUserId:string,

    actorRole:string,
  ){

    const now =
      new Date();


    const periodRange =
      this.getTimezonePeriodRange(
        now,
        env.DEFAULT_TIMEZONE,
        period,
      );


    const start =
      periodRange.start;


    const end =
      periodRange.end;


    const transactions =
      (
        await this.getWorkspaceSheetTransactions(
          workspaceId,
          {
            userId:
              actorUserId,

            role:
              actorRole,
          },
        )
      )
        .filter(
          (transaction) => this.isSheetTransactionInRange(
            transaction,
            start,
            end,
          ),
        )
        .sort(
          (first, second) => this.getSheetTransactionTime(
            first,
          )
          -
          this.getSheetTransactionTime(
            second,
          ),
        );


    const reply =
      this.buildSummaryReply(
        transactions,
        now,
        env.DEFAULT_TIMEZONE,
        period,
        periodRange.label,
      );


    await this.safeSendWebhookReply(
      normalized,
      reply,
    );


    return {

      message:
        "WhatsApp summary sent",

      source:
        "EVOLUTION",

      normalized,

      summary:{
        period,

        label:
          periodRange.label,

        count:
          transactions.length,
      },

    };

  }





  private buildSummaryReply(
    transactions:Array<{
      amount:unknown;
      type:string;
      category?:{
        name:string;
      } | null;
    }>,

    now:Date,

    timezone:string,

    period:
      | "today"
      | "week"
      | "month",

    label:string,
  ){

    void now;
    void timezone;

    return WhatsAppReplyBuilder
      .summary(
        transactions,
        period,
        label,
      );

  }





  private async handleEditLastCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,

    userId:string,

    role:
      | "OWNER"
      | "ADMIN"
      | "MEMBER"
      | "VIEWER",

    edit:WhatsAppEditCommand,
  ){

    void userId;
    void role;

    const transaction =
      (
        await this.getWorkspaceSheetTransactions(
          workspaceId,
        )
      )[0]
      ??
      null;


    if(!transaction){

      await this.safeSendWebhookReply(
        normalized,
        "ℹ️ Tiada transaksi aktif untuk dikemaskini.",
      );


      return {

        message:
          "WhatsApp edit ignored",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            "NO_TRANSACTION_TO_EDIT",
        },

      };

    }


    const data:
      Record<string, unknown> =
        {};

    const updated:any =
      {
        ...transaction,
      };


    if(edit.field === "date"){

      const dateValue =
        this.parseEditDate(
          edit.value,
        );


      if(!dateValue){

        await this.safeSendWebhookReply(
          normalized,
          "⚠️ Tarikh tidak sah. Contoh: edit last date today atau edit last date 2026-07-27",
        );


        return {

          message:
            "WhatsApp edit invalid date",

          source:
            "EVOLUTION",

          normalized,

          edit,

        };

      }


      const currentIso =
        new Date(
          transaction.transactionDate,
        )
          .toISOString();


      data.transactionDate =
        new Date(
          `${dateValue}T${currentIso.slice(11, 19)}.000Z`,
        );

      updated.transactionDate =
        data.transactionDate;

    }


    if(edit.field === "time"){

      const timeValue =
        this.parseEditTime(
          edit.value,
        );


      if(!timeValue){

        await this.safeSendWebhookReply(
          normalized,
          "⚠️ Masa tidak sah. Contoh: edit last time 14:30",
        );


        return {

          message:
            "WhatsApp edit invalid time",

          source:
            "EVOLUTION",

          normalized,

          edit,

        };

      }


      const currentIso =
        new Date(
          transaction.transactionDate,
        )
          .toISOString();


      data.transactionDate =
        new Date(
          `${currentIso.slice(0, 10)}T${timeValue}.000Z`,
        );

      updated.transactionDate =
        data.transactionDate;

    }


    if(edit.field === "type"){

      const transactionType =
        this.parseEditType(
          edit.value,
        );


      if(!transactionType){

        await this.safeSendWebhookReply(
          normalized,
          "⚠️ Jenis transaksi tidak sah. Contoh: edit last type income atau edit last type expense",
        );


        return {

          message:
            "WhatsApp edit invalid type",

          source:
            "EVOLUTION",

          normalized,

          edit,

        };

      }


      data.type =
        transactionType;

      updated.type =
        transactionType;


      if(transactionType === "INCOME"){

        const category =
          await this.findOrCreateEditCategory(
            workspaceId,
            "Salary",
          );


        data.categoryId =
          category.id;

        updated.category =
          {
            name:
              category.name,
          };

      }


      if(
        transactionType === "EXPENSE"
        &&
        transaction.category?.name?.toLowerCase()
        ===
        "salary"
      ){

        const category =
          await this.findOrCreateEditCategory(
            workspaceId,
            "Others",
          );


        data.categoryId =
          category.id;

        updated.category =
          {
            name:
              category.name,
          };

      }

    }


    if(edit.field === "amount"){

      const amount =
        this.parseEditAmount(
          edit.value,
        );


      if(!amount){

        await this.safeSendWebhookReply(
          normalized,
          "⚠️ Amount tidak sah. Contoh: edit last amount rm10",
        );


        return {

          message:
            "WhatsApp edit invalid amount",

          source:
            "EVOLUTION",

          normalized,

          edit,

        };

      }


      data.amount =
        amount;

      updated.amount =
        amount;

    }


    if(edit.field === "description"){

      data.description =
        edit.value;

      updated.description =
        edit.value;

    }


    if(edit.field === "category"){

      const category =
        await this.findOrCreateEditCategory(
          workspaceId,
          edit.value,
        );


      data.categoryId =
        category.id;

      updated.category =
        {
          name:
            category.name,
        };

    }


    if(edit.field === "merchant"){

      const merchant =
        await this.findOrCreateEditMerchant(
          workspaceId,
          edit.value,
        );


      data.merchantId =
        merchant.id;

      updated.merchant =
        {
          name:
            merchant.name,
        };

    }


    if(edit.field === "method"){

      const paymentMethod =
        await this.findOrCreateEditPaymentMethod(
          workspaceId,
          edit.value,
        );


      data.paymentMethodId =
        paymentMethod.id;

      updated.paymentMethod =
        {
          name:
            paymentMethod.name,
        };

    }


    await this.sheetSyncService
      .safeUpdateTransactionRow(
        workspaceId,
        updated,
      );


    await this.safeSendWebhookReply(
      normalized,
      this.buildEditLastReply(
        updated,
        edit.field,
      ),
    );


    return {

      message:
        "WhatsApp transaction edited",

      source:
        "EVOLUTION",

      normalized,

      edit,

      transaction:
        updated,

    };

  }





  private parseEditDate(
    value:string,
  ){

    const normalized =
      value
        .trim()
        .toLowerCase();


    if(
      normalized === "today"
      ||
      normalized === "harini"
      ||
      normalized === "hari ini"
    ){

      return this.formatDateInTimezone(
        new Date(),
        env.DEFAULT_TIMEZONE,
      );

    }


    if(
      normalized === "yesterday"
      ||
      normalized === "semalam"
    ){

      const today =
        this.formatDateInTimezone(
          new Date(),
          env.DEFAULT_TIMEZONE,
        );


      const date =
        new Date(
          `${today}T00:00:00.000Z`,
        );


      date.setUTCDate(
        date.getUTCDate()
        -
        1,
      );


      return date
        .toISOString()
        .slice(
          0,
          10,
        );

    }


    const isoMatch =
      normalized.match(
        /^\d{4}-\d{2}-\d{2}$/,
      );


    if(isoMatch){

      return normalized;

    }


    const slashMatch =
      normalized.match(
        /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/,
      );


    if(slashMatch){

      const day =
        slashMatch[1]
          .padStart(
            2,
            "0",
          );

      const month =
        slashMatch[2]
          .padStart(
            2,
            "0",
          );

      const year =
        slashMatch[3];


      return `${year}-${month}-${day}`;

    }


    return null;

  }





  private parseEditTime(
    value:string,
  ){

    const match =
      value
        .trim()
        .match(
          /^(\d{1,2})[:.](\d{2})$/,
        );


    if(!match){

      return null;

    }


    const hour =
      Number(
        match[1],
      );

    const minute =
      Number(
        match[2],
      );


    if(
      hour < 0
      ||
      hour > 23
      ||
      minute < 0
      ||
      minute > 59
    ){

      return null;

    }


    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  }





  private parseEditType(
    value:string,
  ){

    const normalized =
      value
        .trim()
        .toLowerCase();


    if(
      [
        "income",
        "in",
        "pendapatan",
        "masuk",
        "gaji",
      ].includes(
        normalized,
      )
    ){

      return "INCOME";

    }


    if(
      [
        "expense",
        "out",
        "belanja",
        "perbelanjaan",
        "keluar",
      ].includes(
        normalized,
      )
    ){

      return "EXPENSE";

    }


    return null;

  }





  private parseEditAmount(
    value:string,
  ){

    const match =
      value.match(
        /(?:rm|myr|ringgit)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
      );


    if(!match){

      return null;

    }


    return match[1]
      .replace(
        ",",
        ".",
      );

  }





  private normalizeEditName(
    value:string,
  ){

    return value
      .trim()
      .replace(
        /\s+/g,
        " ",
      );

  }





  private async findOrCreateEditCategory(
    workspaceId:string,

    name:string,
  ){

    const normalized =
      this.normalizeEditName(
        name,
      );


    const categories =
      await this.app.prisma.category
        .findMany({
          where:{
            workspaceId,
          },
        });


    const existing =
      categories.find(
        (category) =>
          category.name.toLowerCase()
          ===
          normalized.toLowerCase(),
      );


    if(existing){

      return existing;

    }


    return this.app.prisma.category
      .create({
        data:{
          workspaceId,

          name:
            normalized,
        },
      });

  }





  private async findOrCreateEditMerchant(
    workspaceId:string,

    name:string,
  ){

    const normalized =
      this.normalizeEditName(
        name,
      );


    const merchants =
      await this.app.prisma.merchant
        .findMany({
          where:{
            workspaceId,
          },
        });


    const existing =
      merchants.find(
        (merchant) =>
          merchant.name.toLowerCase()
          ===
          normalized.toLowerCase(),
      );


    if(existing){

      return existing;

    }


    return this.app.prisma.merchant
      .create({
        data:{
          workspaceId,

          name:
            normalized,
        },
      });

  }





  private async findOrCreateEditPaymentMethod(
    workspaceId:string,

    name:string,
  ){

    const normalized =
      this.normalizeEditName(
        name,
      );


    const paymentMethods =
      await this.app.prisma.paymentMethod
        .findMany({
          where:{
            workspaceId,
          },
        });


    const existing =
      paymentMethods.find(
        (paymentMethod) =>
          paymentMethod.name.toLowerCase()
          ===
          normalized.toLowerCase(),
      );


    if(existing){

      return existing;

    }


    return this.app.prisma.paymentMethod
      .create({
        data:{
          workspaceId,

          name:
            normalized,
        },
      });

  }





  private buildEditLastReply(
    transaction:any,

    field:string,
  ){

    return WhatsAppReplyBuilder
      .editLast(
        transaction,
        field,
      );

  }





  private async handleUndoCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,
  ){

    const since =
      new Date(
        Date.now()
        -
        15 * 60 * 1000,
      );


    const transaction =
      (
        await this.getWorkspaceSheetTransactions(
          workspaceId,
        )
      )
        .find(
          (item) =>
            this.getSheetTransactionTime(
              item,
            )
            >=
            since.getTime(),
        )
      ??
      null;


    if(!transaction){

      await this.safeSendWebhookReply(
        normalized,
        "ℹ️ Tiada transaksi terbaru untuk dibatalkan.",
      );


      return {

        message:
          "WhatsApp undo ignored",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            "NO_RECENT_TRANSACTION_TO_UNDO",
        },

      };

    }


    const cancelled =
      transaction;


    await this.sheetSyncService
      .safeMarkCancelled(
        workspaceId,
        cancelled.id,
      );


    await this.safeSendWebhookReply(
      normalized,
      this.buildUndoReply(
        cancelled,
      ),
    );


    return {

      message:
        "WhatsApp undo completed",

      source:
        "EVOLUTION",

      normalized,

      transaction:
        cancelled,

    };

  }





  private getTimezonePeriodRange(
    date:Date,

    timezone:string,

    period:
      | "today"
      | "week"
      | "month",
  ){

    if(period === "week"){

      return this.getTimezoneWeekRange(
        date,
        timezone,
      );

    }


    if(period === "month"){

      return this.getTimezoneMonthRange(
        date,
        timezone,
      );

    }


    return this.getTimezoneDayRange(
      date,
      timezone,
    );

  }





  private getTimezoneDayRange(
    date:Date,

    timezone:string,
  ){

    const localDate =
      this.formatDateInTimezone(
        date,
        timezone,
      );


    const start =
      this.zonedDateTimeToUtc(
        `${localDate}T00:00:00`,
        timezone,
      );


    const end =
      this.zonedDateTimeToUtc(
        `${localDate}T23:59:59.999`,
        timezone,
      );


    return {
      start,
      end,
      label:
        localDate,
    };

  }





  private getTimezoneWeekRange(
    date:Date,

    timezone:string,
  ){

    const localDate =
      this.formatDateInTimezone(
        date,
        timezone,
      );


    const [
      year,
      month,
      day,
    ] =
      localDate
        .split(
          "-",
        )
        .map(
          Number,
        );


    const localUtcNoon =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
          12,
          0,
          0,
          0,
        ),
      );


    const dayOfWeek =
      localUtcNoon.getUTCDay();


    const daysFromMonday =
      (
        dayOfWeek
        +
        6
      )
      %
      7;


    const startLocal =
      new Date(
        localUtcNoon.getTime()
        -
        daysFromMonday * 24 * 60 * 60 * 1000,
      );


    const endLocal =
      new Date(
        startLocal.getTime()
        +
        6 * 24 * 60 * 60 * 1000,
      );


    const startDate =
      startLocal
        .toISOString()
        .slice(
          0,
          10,
        );


    const endDate =
      endLocal
        .toISOString()
        .slice(
          0,
          10,
        );


    return {
      start:
        this.zonedDateTimeToUtc(
          `${startDate}T00:00:00`,
          timezone,
        ),

      end:
        this.zonedDateTimeToUtc(
          `${endDate}T23:59:59.999`,
          timezone,
        ),

      label:
        `${startDate} to ${endDate}`,
    };

  }





  private getTimezoneMonthRange(
    date:Date,

    timezone:string,
  ){

    const localDate =
      this.formatDateInTimezone(
        date,
        timezone,
      );


    const [
      year,
      month,
    ] =
      localDate
        .split(
          "-",
        )
        .map(
          Number,
        );


    const startDate =
      `${year}-${String(month).padStart(2, "0")}-01`;


    const lastDay =
      new Date(
        Date.UTC(
          year,
          month,
          0,
        ),
      )
        .getUTCDate();


    const endDate =
      `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;


    return {
      start:
        this.zonedDateTimeToUtc(
          `${startDate}T00:00:00`,
          timezone,
        ),

      end:
        this.zonedDateTimeToUtc(
          `${endDate}T23:59:59.999`,
          timezone,
        ),

      label:
        `${year}-${String(month).padStart(2, "0")}`,
    };

  }





  private zonedDateTimeToUtc(
    localDateTime:string,

    timezone:string,
  ){

    let utcGuess =
      new Date(
        `${localDateTime}Z`,
      );


    for(
      let index = 0;
      index < 3;
      index += 1
    ){

      const parts =
        this.getDateTimePartsInTimezone(
          utcGuess,
          timezone,
        );


      const asIfUtc =
        new Date(
          `${parts.date}T${parts.time}Z`,
        );


      const target =
        new Date(
          `${localDateTime}Z`,
        );


      const diff =
        asIfUtc.getTime()
        -
        target.getTime();


      utcGuess =
        new Date(
          utcGuess.getTime()
          -
          diff,
        );

    }


    return utcGuess;

  }





  private formatDateInTimezone(
    date:Date,

    timezone:string,
  ){

    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          timezone,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    )
      .format(
        date,
      );

  }





  private getDateTimePartsInTimezone(
    date:Date,

    timezone:string,
  ){

    const parts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            timezone,

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hour12:
            false,
        } as Intl.DateTimeFormatOptions,
      )
        .formatToParts(
          date,
        );


    const value =
      (type:string) =>
        parts.find(
          (part) =>
            part.type === type,
        )?.value
        ??
        "00";


    return {
      date:
        `${value("year")}-${value("month")}-${value("day")}`,

      time:
        `${value("hour")}:${value("minute")}:${value("second")}`,
    };

  }





  private buildUndoReply(
    transaction:{
      amount:unknown;
      currency:string;
      description:string | null;
      category?:{
        name:string;
      } | null;
      merchant?:{
        name:string;
      } | null;
    },
  ){

    return WhatsAppReplyBuilder
      .undo(
        transaction,
      );

  }





  private buildHelpReply(
    botAlias:string,
    language:"ms" | "en" = "ms",
  ){

    if(language === "en"){
      const normalizedBotAlias =
        botAlias
          .trim()
          .replace(
            /^@+/,
            "",
          )
          .toLowerCase()
        ||
        "mypocket";

      const aliasTrigger =
        `@${normalizedBotAlias}`;

      return [
        "👋 MyPocket AI — Quick help",
        "",
        "📣 *In WhatsApp groups:*",
        `• Start messages with *!* or *${aliasTrigger}*`,
        "• Messages without a trigger are ignored.",
        "",
        "💬 *Private chat:*",
        "• No ! or alias is required.",
        "",
        "🧾 *Record transactions:*",
        "• !lunch mamak rm7.80 tng",
        `• ${aliasTrigger} petrol shell rm50 cash`,
        "• bill unifi rm129 bank",
        "• salary rm3000",
        "",
        "🔔 *Commitments & reminders:*",
        "• !reminder — unpaid commitments",
        "• !all reminders — all commitments",
        "• !paid reminders — completed commitments",
        "• !Remind me to pay car RM1000 every 10th",
        "• !change reminder car to 15th",
        "• !paid car / !mark paid car",
        "• !disable reminder car / !enable reminder car",
        "• !delete commitment car",
        "",
        "📊 *Summaries & controls:*",
        "• !today — today summary",
        "• !week — this week summary",
        "• !month — this month summary",
        "• !last — last transaction",
        "• !undo — undo last transaction",
        "• !categories — category list",
        "• !methods — payment methods",
        "• !members — WhatsApp members",
        "• !status — bot status",
        "• !commands — all commands",
        "",
        "🌐 Reply language can be changed in Dashboard → Bot Settings.",
        "Category, merchant, and payment method are detected automatically.",
      ].join(
        "\n",
      );
    }

    return WhatsAppReplyBuilder
      .help(
        botAlias,
      );

  }


  private async safeParseWebhookTransaction(
    normalized:NormalizedEvolutionMessage,
  ){

    try{

      return {
        parsed:
          this.parseTransactionText(
            normalized.text
            ??
            "",
            normalized.timestamp,
          ),
      };

    }catch(error){

      const reason =
        error instanceof AppError
          ?
          error.code
          :
          "WHATSAPP_PARSE_FAILED";


      await this.safeSendWebhookReply(
        normalized,
        this.buildParseFailedReply(
          reason,
        ),
      );


      return {
        parsed:
          null,

        reason,
      };

    }

  }





  private buildParseFailedReply(
    reason:string,
  ){

    return WhatsAppReplyBuilder
      .parseFailed(
        reason,
      );

  }





  private async safeSendWebhookReply(
    normalized:NormalizedEvolutionMessage,

    text:string,
  ):Promise<void>{

    try{

      await this.sendWhatsAppText(
        normalized.instanceName
        ??
        "",

        normalized.remoteJid
        ??
        "",

        text,
      );

    }catch(error){

      console.error(
        "WHATSAPP_REPLY_FAILED:",
        error,
      );

    }

  }





  private async sendWhatsAppText(
    instanceName:string,

    remoteJid:string,

    text:string,
  ):Promise<void>{

    if(
      !instanceName
      ||
      !remoteJid
    ){

      return;

    }


    if(
      !env.EVOLUTION_API_KEY
    ){

      throw new AppError(
        "EVOLUTION_API_KEY_MISSING",
        "Evolution API key is not configured",
        500,
      );

    }


    const normalizedRemoteJid =
      remoteJid
        .trim();


    const number =
      normalizedRemoteJid
        .toLowerCase()
        .endsWith(
          "@g.us",
        )
        ?
        normalizedRemoteJid
        :
        this.extractPhoneNumber(
          normalizedRemoteJid,
        );


    if(!number){

      return;

    }


    const response =
      await fetch(
        `${env.EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instanceName)}`,
        {

          method:
            "POST",

          headers:{
            apikey:
              env.EVOLUTION_API_KEY,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              number,

              text,
            }),

        },
      );


    if(!response.ok){

      const body =
        await response.text();


      throw new AppError(
        "EVOLUTION_SEND_TEXT_FAILED",
        body
        ||
        "Cannot send WhatsApp reply",
        response.status,
      );

    }

  }





  private buildTransactionReply(
    parsed:ParsedWhatsAppTransaction,
  ){

    return WhatsAppReplyBuilder
      .transaction(
        parsed,
      );

  }





  private normalizeWhatsAppPhoneNumber(
    value:string,
  ){

    return value
      .replace(
        /\D/g,
        "",
      );

  }





  private extractPhoneNumber(
    remoteJid:string,
  ){

    const beforeAt =
      remoteJid.split(
        "@",
      )[0]
      ??
      remoteJid;


    return beforeAt
      .replace(
        /\D/g,
        "",
      );

  }





  private async findDuplicateTransaction(
    workspaceId:string,

    text:string,

    transactionDate?:string,
  ){

    const parsed =
      this.parseTransactionText(
        text,
        transactionDate,
      );


    const parsedDate =
      new Date(
        parsed.transactionDate,
      )
        .getTime();


    const transactions =
      await this.getWorkspaceSheetTransactions(
        workspaceId,
      );


    return transactions
      .find(
        (transaction) => (
          String(
            transaction.amount,
          )
          ===
          parsed.amount
          &&
          (
            transaction.description
            ??
            ""
          )
          ===
          parsed.description
          &&
          this.getSheetTransactionTime(
            transaction,
          )
          ===
          parsedDate
        ),
      )
      ??
      null;

  }





  private parseTransactionText(
    text:string,

    transactionDate?:string,

    currency = "MYR",
  ):ParsedWhatsAppTransaction{

    const rawText =
      text.trim();


    const amountMatch =
      rawText.match(
        /(?:rm\s*)?(\d+(?:[.,]\d{1,2})?)/i,
      );


    if(!amountMatch){

      throw new AppError(
        "WHATSAPP_AMOUNT_NOT_FOUND",
        "Cannot find amount in WhatsApp message",
        400,
      );

    }


    const amount =
      amountMatch[1]
        .replace(
          ",",
          ".",
        );


    const amountValue =
      Number(
        amount,
      );


    if(
      !Number.isFinite(
        amountValue,
      )
      ||
      amountValue <= 0
    ){

      throw new AppError(
        "WHATSAPP_INVALID_AMOUNT",
        "Invalid WhatsApp transaction amount",
        400,
      );

    }


    const lowerText =
      rawText.toLowerCase();


    const type:
      WhatsAppTransactionType =
        this.isIncomeText(
          lowerText,
        )
          ?
          "INCOME"
          :
          "EXPENSE";


    const categoryName =
      this.guessCategory(
        lowerText,
        type,
      );


    return {

      amount,

      currency:
        currency.toUpperCase(),

      type,

      categoryName,

      merchantName:
        type === "INCOME"
          ?
          undefined
          :
          this.guessMerchant(
            rawText,
            amountMatch[0],
          ),

      paymentMethodName:
        this.guessPaymentMethod(
          lowerText,
        ),

      description:
        rawText,

      transactionDate:
        transactionDate
        ??
        new Date()
          .toISOString(),

      rawText,

    };

  }





  private normalizeEvolutionPayload(
    payload:unknown,
  ):NormalizedEvolutionMessage{

    const body =
      this.asRecord(
        payload,
      );


    const data =
      this.asRecord(
        body.data,
      );


    const event =
      this.asString(
        body.event
        ??
        data.event,
      );


    if(
      event
      &&
      !event.toLowerCase()
        .includes(
          "message",
        )
    ){

      return {
        accepted:false,
        reason:"EVENT_NOT_MESSAGE",
        event,
      };

    }


    const instanceName =
      this.asString(
        body.instance
        ??
        body.instanceName
        ??
        data.instance
        ??
        data.instanceName,
      );


    if(!instanceName){

      return {
        accepted:false,
        reason:"INSTANCE_NAME_MISSING",
        event,
      };

    }


    const key =
      this.asRecord(
        data.key,
      );


    const fromMe =
      Boolean(
        key.fromMe
        ??
        data.fromMe,
      );


    if(fromMe){

      return {
        accepted:false,
        reason:"MESSAGE_FROM_SELF",
        event,
        instanceName,
      };

    }


    const message =
      this.asRecord(
        data.message
        ??
        body.message,
      );


    const text =
      this.extractMessageText(
        message,
      );


    if(!text){

      return {
        accepted:false,
        reason:"MESSAGE_TEXT_MISSING",
        event,
        instanceName,
      };

    }


    return {

      accepted:true,

      event,

      instanceName,

      remoteJid:
        this.asString(
          key.remoteJid
          ??
          data.remoteJid,
        ),

      participantJid:
        this.asString(
          key.participantAlt,
        )
        ||
        this.asString(
          data.participantAlt,
        )
        ||
        this.asString(
          key.participant,
        )
        ||
        this.asString(
          data.participant,
        )
        ||
        this.asString(
          data.sender,
        ),

      pushName:
        this.asString(
          data.pushName
          ??
          body.pushName,
        ),

      messageId:
        this.asString(
          key.id
          ??
          data.id,
        ),

      text,

      timestamp:
        this.normalizeTimestamp(
          data.messageTimestamp
          ??
          body.messageTimestamp,
        ),

    };

  }





  private extractMessageText(
    message:Record<string, unknown>,
  ){

    const candidates = [
      message.conversation,
      this.asRecord(
        message.extendedTextMessage,
      ).text,
      this.asRecord(
        message.imageMessage,
      ).caption,
      this.asRecord(
        message.videoMessage,
      ).caption,
      this.asRecord(
        message.documentMessage,
      ).caption,
      this.asRecord(
        message.buttonsResponseMessage,
      ).selectedDisplayText,
      this.asRecord(
        message.listResponseMessage,
      ).title,
    ];


    const found =
      candidates.find(
        (candidate) =>
          typeof candidate === "string"
          &&
          candidate.trim().length > 0,
      );


    return typeof found === "string"
      ?
      found.trim()
      :
      "";

  }





  private normalizeTimestamp(
    value:unknown,
  ){

    const numeric =
      typeof value === "number"
        ?
        value
        :
        typeof value === "string"
          ?
          Number(value)
          :
          NaN;


    if(
      Number.isFinite(
        numeric,
      )
    ){

      const milliseconds =
        numeric > 1000000000000
          ?
          numeric
          :
          numeric * 1000;


      return new Date(
        milliseconds,
      )
        .toISOString();

    }


    return new Date()
      .toISOString();

  }





  private guessPaymentMethod(
    text:string,
  ){

    const methods:
      Array<{
        name:string;
        keywords:string[];
      }> =
      [
        {
          name:"TNG",
          keywords:[
            "tng",
            "touch n go",
            "touchngo",
            "touch 'n go",
          ],
        },
        {
          name:"Cash",
          keywords:[
            "cash",
            "tunai",
          ],
        },
        {
          name:"Bank",
          keywords:[
            "bank",
            "transfer",
            "ibg",
            "instant transfer",
            "fpx",
          ],
        },
        {
          name:"Card",
          keywords:[
            "card",
            "kad",
            "credit card",
            "debit card",
            "visa",
            "mastercard",
          ],
        },
        {
          name:"DuitNow",
          keywords:[
            "duitnow",
            "qr",
            "duit now",
          ],
        },
        {
          name:"GrabPay",
          keywords:[
            "grabpay",
            "grab pay",
          ],
        },
      ];


    const match =
      methods.find(
        (method) =>
          method.keywords.some(
            (keyword) =>
              text.includes(
                keyword,
              ),
          ),
      );


    return match?.name;

  }





  private guessMerchant(
    rawText:string,

    amountToken:string,
  ){

    const beforeAmount =
      rawText
        .slice(
          0,
          rawText.toLowerCase()
            .indexOf(
              amountToken.toLowerCase(),
            ),
        )
        .trim();


    const cleaned =
      beforeAmount
        .replace(
          /^(makan|minum|food|petrol|minyak|grab|taxi|tol|toll|parking|bill|bil|belanja|beli|shopping|gaji|salary|income)\s+/i,
          "",
        )
        .replace(
          /\s+/g,
          " ",
        )
        .trim();


    if(
      cleaned.length < 2
    ){

      return undefined;

    }


    return cleaned
      .slice(
        0,
        80,
      );

  }





  private isIncomeText(
    text:string,
  ){

    return [
      "income",
      "gaji",
      "salary",
      "bonus",
      "komisen",
      "commission",
      "masuk",
      "upah",
      "terima",
      "dapat",
      "received",
      "payment received",
      "bayaran masuk",
      "refund",
      "cashback",
    ].some(
      (keyword) =>
        text.includes(
          keyword,
        ),
    );

  }





  private guessCategory(
    text:string,

    type:WhatsAppTransactionType,
  ){

    if(type === "INCOME"){

      return "Salary";

    }


    const categories:
      Array<{
        name:string;
        keywords:string[];
      }> =
      [
        {
          name:"Food",
          keywords:[
            "makan",
            "minum",
            "food",
            "lunch",
            "dinner",
            "breakfast",
            "kopi",
            "restaurant",
            "nasi",
          ],
        },
        {
          name:"Transport",
          keywords:[
            "petrol",
            "minyak",
            "grab",
            "taxi",
            "tol",
            "toll",
            "parking",
            "train",
            "bas",
          ],
        },
        {
          name:"Bills",
          keywords:[
            "bill",
            "bil",
            "electric",
            "elektrik",
            "air",
            "water",
            "internet",
            "phone",
            "telco",
          ],
        },
        {
          name:"Shopping",
          keywords:[
            "shopping",
            "belanja",
            "shopee",
            "lazada",
            "beli",
          ],
        },
        {
          name:"Rent",
          keywords:[
            "rent",
            "sewa",
          ],
        },
      ];


    const match =
      categories.find(
        (category) =>
          category.keywords.some(
            (keyword) =>
              text.includes(
                keyword,
              ),
          ),
      );


    return match?.name
      ??
      "Others";

  }





  private async findOrCreatePaymentMethod(
    workspaceId:string,

    name:string,
  ){

    const existing =
      await this.app.prisma.paymentMethod
        .findFirst({
          where:{
            workspaceId,
            name,
          },
        });


    if(existing){

      return existing;

    }


    return this.app.prisma.paymentMethod
      .create({
        data:{
          workspaceId,
          name,
        },
      });

  }





  private async findOrCreateMerchant(
    workspaceId:string,

    name:string,
  ){

    const existing =
      await this.app.prisma.merchant
        .findFirst({
          where:{
            workspaceId,
            name,
          },
        });


    if(existing){

      return existing;

    }


    return this.app.prisma.merchant
      .create({
        data:{
          workspaceId,
          name,
        },
      });

  }





  private async findOrCreateCategory(
    workspaceId:string,

    name:string,
  ){

    const existing =
      await this.app.prisma.category
        .findFirst({
          where:{
            workspaceId,
            name,
          },
        });


    if(existing){

      return existing;

    }


    return this.app.prisma.category
      .create({
        data:{
          workspaceId,
          name,
        },
      });

  }





  private asRecord(
    value:unknown,
  ):Record<string, unknown>{

    return typeof value === "object"
      &&
      value !== null
      ?
      value as Record<string, unknown>
      :
      {};

  }





  private asString(
    value:unknown,
  ){

    return typeof value === "string"
      ?
      value
      :
      "";

  }

}
