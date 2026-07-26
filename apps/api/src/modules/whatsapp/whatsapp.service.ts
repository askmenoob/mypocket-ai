import type {
  FastifyInstance,
} from "fastify";


import {
  env,
} from "../../config/env.js";


import {
  GoogleSheetsService,
} from "../google/sheets/google-sheets.service.js";


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


  private readonly sheetsService:
    GoogleSheetsService;



  constructor(
    private readonly app:FastifyInstance,
  ){

    this.transactionService =
      new TransactionService(
        app,
      );


    this.sheetsService =
      new GoogleSheetsService(
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


    if(
      this.isHelpCommand(
        normalized.text
        ??
        "",
      )
    ){

      await this.safeSendWebhookReply(
        normalized,
        this.buildHelpReply(),
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
      this.isUndoCommand(
        normalized.text
        ??
        "",
      );


    const summaryPeriod =
      this.getSummaryPeriodCommand(
        normalized.text
        ??
        "",
      );


    const isStatus =
      this.isStatusCommand(
        normalized.text
        ??
        "",
      );


    const isLast =
      this.isLastCommand(
        normalized.text
        ??
        "",
      );


    const isCategories =
      this.isCategoriesCommand(
        normalized.text
        ??
        "",
      );


    const infoCommand =
      this.getInfoCommand(
        normalized.text
        ??
        "",
      );


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


    if(isLast){

      return this.handleLastCommand(
        instance.workspaceId,
        normalized,
      );

    }


    if(isCategories){

      return this.handleCategoriesCommand(
        normalized,
      );

    }


    if(infoCommand){

      return this.handleInfoCommand(
        normalized,
        infoCommand,
      );

    }


    if(summaryPeriod){

      return this.handleSummaryCommand(
        instance.workspaceId,
        normalized,
        summaryPeriod,
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
            ownerMember.userId,

          workspaceId:
            instance.workspaceId,

          role:
            ownerMember.role,
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





  private getInfoCommand(
    text:string,
  ):
    | "methods"
    | "commands"
    | null {

    const normalized =
      text
        .trim()
        .toLowerCase();


    if(
      [
        "methods",
        "/methods",
        "payment methods",
        "payment",
        "bayaran",
        "cara bayar",
      ].includes(
        normalized,
      )
    ){

      return "methods";

    }


    if(
      [
        "commands",
        "/commands",
        "command",
        "menu",
        "senarai command",
      ].includes(
        normalized,
      )
    ){

      return "commands";

    }


    return null;

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

    return [
      "💳 Payment method auto MyPocket",
      "",
      "• TNG — tng, touch n go",
      "• Cash — cash, tunai",
      "• Bank — bank, transfer, fpx",
      "• Card — card, kad, visa",
      "• DuitNow — duitnow, qr",
      "• GrabPay — grabpay",
    ].join(
      "\n",
    );

  }





  private buildCommandsReply(){

    return [
      "📋 Command MyPocket AI",
      "",
      "• help — bantuan format",
      "• today — ringkasan hari ini",
      "• week / minggu — ringkasan minggu ini",
      "• month / bulan — ringkasan bulan ini",
      "• last — transaksi terakhir",
      "• undo / batal — batalkan transaksi terakhir",
      "• categories — senarai kategori",
      "• methods — senarai payment method",
      "• status — semak sambungan bot",
    ].join(
      "\n",
    );

  }





  private isCategoriesCommand(
    text:string,
  ){

    const normalized =
      text
        .trim()
        .toLowerCase();


    return [
      "categories",
      "/categories",
      "category",
      "kategori",
      "senarai kategori",
    ].includes(
      normalized,
    );

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





  private isLastCommand(
    text:string,
  ){

    const normalized =
      text
        .trim()
        .toLowerCase();


    return [
      "last",
      "/last",
      "latest",
      "terakhir",
      "transaksi terakhir",
    ].includes(
      normalized,
    );

  }





  private async handleLastCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,
  ){

    const transaction =
      await this.app.prisma.transaction
        .findFirst({

          where:{
            workspaceId,

            status:{
              not:
                "CANCELLED",
            },
          },

          include:{
            category:true,
            merchant:true,
            paymentMethod:true,
          },

          orderBy:{
            createdAt:
              "desc",
          },

        });


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





  private isStatusCommand(
    text:string,
  ){

    const normalized =
      text
        .trim()
        .toLowerCase();


    return [
      "status",
      "/status",
      "check",
      "semak",
    ].includes(
      normalized,
    );

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





  private getSummaryPeriodCommand(
    text:string,
  ):
    | "today"
    | "week"
    | "month"
    | null {

    const normalized =
      text
        .trim()
        .toLowerCase();


    if(
      [
        "today",
        "/today",
        "summary",
        "ringkasan",
        "hari ini",
        "hariini",
        "harini",
        "today summary",
      ].includes(
        normalized,
      )
    ){

      return "today";

    }


    if(
      [
        "week",
        "/week",
        "weekly",
        "summary week",
        "ringkasan minggu",
        "minggu ini",
        "minggu",
      ].includes(
        normalized,
      )
    ){

      return "week";

    }


    if(
      [
        "month",
        "/month",
        "monthly",
        "summary month",
        "ringkasan bulan",
        "bulan ini",
        "bulan",
      ].includes(
        normalized,
      )
    ){

      return "month";

    }


    return null;

  }





  private async handleSummaryCommand(
    workspaceId:string,

    normalized:NormalizedEvolutionMessage,

    period:
      | "today"
      | "week"
      | "month",
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
      await this.app.prisma.transaction
        .findMany({

          where:{
            workspaceId,

            status:{
              not:
                "CANCELLED",
            },

            transactionDate:{
              gte:
                start,

              lte:
                end,
            },
          },

          include:{
            category:true,
          },

          orderBy:{
            transactionDate:
              "asc",
          },

        });


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

    let expense =
      0;


    let income =
      0;


    const categoryTotals =
      new Map<string, number>();


    for(
      const transaction of transactions
    ){

      const amount =
        Number(
          transaction.amount,
        );


      if(
        !Number.isFinite(
          amount,
        )
      ){

        continue;

      }


      if(
        transaction.type === "INCOME"
      ){

        income += amount;

      }else{

        expense += amount;


        const category =
          transaction.category?.name
          ??
          "Others";


        categoryTotals.set(
          category,
          (
            categoryTotals.get(
              category,
            )
            ??
            0
          )
          +
          amount,
        );

      }

    }


    const topCategory =
      [...categoryTotals.entries()]
        .sort(
          (
            first,
            second,
          ) =>
            second[1]
            -
            first[1],
        )[0];


    const title =
      period === "today"
        ?
        "📊 Ringkasan hari ini"
        :
        period === "week"
          ?
          "📊 Ringkasan minggu ini"
          :
          "📊 Ringkasan bulan ini";


    return [
      title,
      label,
      "",
      `Expense: MYR ${expense.toFixed(2)}`,
      `Income: MYR ${income.toFixed(2)}`,
      `Net: MYR ${(income - expense).toFixed(2)}`,
      `Transaksi: ${transactions.length}`,
      topCategory
        ?
        `Top category: ${topCategory[0]} MYR ${topCategory[1].toFixed(2)}`
        :
        "Top category: -",
    ].join(
      "\n",
    );

  }





  private isUndoCommand(
    text:string,
  ){

    const normalized =
      text
        .trim()
        .toLowerCase();


    return [
      "undo",
      "/undo",
      "cancel",
      "batal",
      "delete last",
      "padam",
    ].includes(
      normalized,
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
      await this.app.prisma.transaction
        .findFirst({

          where:{
            workspaceId,

            status:{
              not:
                "CANCELLED",
            },

            createdAt:{
              gte:
                since,
            },
          },

          include:{
            category:true,
            merchant:true,
            paymentMethod:true,
            workspace:{
              select:{
                type:true,
              },
            },
          },

          orderBy:{
            createdAt:
              "desc",
          },

        });


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
      await this.app.prisma.transaction
        .update({

          where:{
            id:
              transaction.id,
          },

          data:{
            status:
              "CANCELLED",
          },

          include:{
            category:true,
            merchant:true,
            paymentMethod:true,
            workspace:{
              select:{
                type:true,
              },
            },
          },

        });


    await this.safeMarkGoogleSheetCancelled(
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





  private async safeMarkGoogleSheetCancelled(
    workspaceId:string,

    transactionId:string,
  ):Promise<void>{

    try{

      await this.markGoogleSheetTransactionCancelled(
        workspaceId,
        transactionId,
      );

    }catch(error){

      console.error(
        "GOOGLE_SHEET_UNDO_MARK_FAILED:",
        error,
      );

    }

  }





  private async markGoogleSheetTransactionCancelled(
    workspaceId:string,

    transactionId:string,
  ):Promise<void>{

    const setting =
      await this.app.prisma.workspaceGoogleSetting
        .findUnique({
          where:{
            workspaceId,
          },
        });


    if(!setting){

      return;

    }


    const rows =
      await this.sheetsService
        .readRange(
          workspaceId,
          {
            spreadsheetId:
              setting.spreadsheetId,

            range:
              "Transactions!A:M",
          },
        );


    const rowIndex =
      rows.findIndex(
        (row) =>
          String(
            row[0]
            ??
            "",
          )
          ===
          transactionId,
      );


    if(rowIndex < 1){

      return;

    }


    const rowNumber =
      rowIndex
      +
      1;


    const row =
      rows[rowIndex]
      ??
      [];


    const description =
      String(
        row[6]
        ??
        "",
      );


    if(
      description.startsWith(
        "[CANCELLED]",
      )
    ){

      return;

    }


    await this.sheetsService
      .updateRange(
        workspaceId,
        {
          spreadsheetId:
            setting.spreadsheetId,

          range:
            `Transactions!G${rowNumber}:G${rowNumber}`,

          values:[
            [
              `[CANCELLED] ${description}`
                .trim(),
            ],
          ],
        },
      );

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


    const description =
      transaction.description
      ??
      "";


    return [
      "↩️ Transaksi terakhir dibatalkan:",
      `${category}${merchant}`,
      `${transaction.currency}${transaction.amount}`,
      description
        ?
        `— ${description}`
        :
        "",
    ].filter(Boolean)
      .join(
        " ",
      );

  }





  private isHelpCommand(
    text:string,
  ){

    const normalized =
      text
        .trim()
        .toLowerCase();


    return [
      "help",
      "/help",
      "bantuan",
      "format",
      "cara guna",
      "macam mana",
    ].includes(
      normalized,
    );

  }





  private buildHelpReply(){

    return [
      "👋 MyPocket AI",
      "",
      "Hantar transaksi dalam format ringkas:",
      "• makan kedai mamak rm7.80 tng",
      "• petrol shell rm50 cash",
      "• bill unifi rm129 bank",
      "• gaji rm3000",
      "",
      "Command:",
      "• today — ringkasan hari ini",
      "• week — ringkasan minggu ini",
      "• month — ringkasan bulan ini",
      "• undo — batalkan transaksi terakhir",
      "• categories — senarai kategori auto",
      "• methods — senarai payment method",
      "• commands — senarai semua command",
      "• status — semak sambungan bot",
      "• help — bantuan format",
      "",
      "Kategori, merchant dan payment method akan dikesan automatik.",
    ].join(
      "\n",
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

    if(
      reason === "WHATSAPP_AMOUNT_NOT_FOUND"
    ){

      return [
        "⚠️ Saya tak jumpa amount.",
        "Contoh: makan kedai mamak rm7.80 tng",
        "",
        "Taip help untuk lihat format.",
      ].join(
        "\n",
      );

    }


    return [
      "⚠️ Saya tak dapat faham transaksi ini.",
      "Contoh: petrol shell rm50 cash",
      "",
      "Taip help untuk lihat format.",
    ].join(
      "\n",
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


    const number =
      this.extractPhoneNumber(
        remoteJid,
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

    const label =
      parsed.type === "INCOME"
        ?
        "Pendapatan"
        :
        "Perbelanjaan";


    const merchant =
      parsed.merchantName
        ?
        ` @ ${parsed.merchantName}`
        :
        "";


    const paymentMethod =
      parsed.paymentMethodName
        ?
        ` (${parsed.paymentMethodName})`
        :
        "";


    return [
      "✅ Direkod",
      `${label}: ${parsed.categoryName}${merchant}${paymentMethod}`,
      `RM${parsed.amount}`,
      `— ${parsed.description}`,
    ].join(
      " ",
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


    return this.app.prisma.transaction
      .findFirst({
        where:{
          workspaceId,

          amount:
            parsed.amount,

          description:
            parsed.description,

          transactionDate:
            new Date(
              parsed.transactionDate,
            ),
        },

        include:{

          category:true,

          merchant:true,

          paymentMethod:true,

          workspace:{
            select:{
              type:true,
            },
          },

        },
      });

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
