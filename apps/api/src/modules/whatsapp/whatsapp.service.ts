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
  AppError,
} from "../../shared/errors/index.js";


import type {
  NormalizedEvolutionMessage,
  ParsedWhatsAppTransaction,
  WhatsAppDevInstanceInput,
  WhatsAppDevTransactionInput,
  WhatsAppTransactionType,
} from "./whatsapp.types.js";



export class WhatsAppService {


  private readonly transactionService:
    TransactionService;



  constructor(
    private readonly app:FastifyInstance,
  ){

    this.transactionService =
      new TransactionService(
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


    if(!base64){

      throw new AppError(
        "EVOLUTION_QR_NOT_FOUND",
        "Evolution QR not found",
        404,
      );

    }


    return base64;

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


    const ownerMember =
      await this.app.prisma.workspaceMember
        .findFirst({

          where:{
            workspaceId:
              instance.workspaceId,

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

        });


    if(!ownerMember){

      return {

        message:
          "WhatsApp webhook ignored",

        source:
          "EVOLUTION",

        normalized:{
          ...normalized,

          reason:
            "WORKSPACE_OWNER_NOT_FOUND",
        },

      };

    }


    const result =
      await this.createDevTransaction({

        text:
          normalized.text!,

        transactionDate:
          normalized.timestamp,

        user:{
          userId:
            ownerMember.userId,

          workspaceId:
            instance.workspaceId,

          role:
            ownerMember.role,
        },

      });


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

      return "Income";

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
