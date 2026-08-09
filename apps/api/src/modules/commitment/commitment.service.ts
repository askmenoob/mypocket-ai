import type {
  FastifyInstance,
} from "fastify";

import {
  randomUUID,
} from "node:crypto";

import {
  AppError,
} from "../../shared/errors/index.js";

import type {
  BotSettingsBody,
  CreateCommitmentBody,
  UpdateCommitmentBody,
} from "./commitment.schemas.js";

import {
  TransactionService,
} from "../transaction/transaction.service.js";

import {
  GoogleSettingsRepository,
} from "../google/settings/google-settings.repository.js";

import {
  GoogleSheetsService,
} from "../google/sheets/google-sheets.service.js";

type Actor = {
  userId:string;
  email?:string;
  workspaceId:string;
  role:string;
};

type CommitmentStatusFilter =
  | "unpaid"
  | "paid"
  | "overdue"
  | "all"
  | "inactive";

type SheetCommitment = {
  id:string;
  workspaceId:string;
  ownerUserId:string;
  ownerEmail:string;
  name:string;
  amount:string;
  currency:string;
  frequency:string;
  dueDay:number;
  reminderDaysBefore:number;
  reminderTime:string;
  timezone:string;
  status:string;
  currentPeriod:string;
  nextDueDate:string;
  lastPaidAt:string;
  createdAt:string;
  updatedAt:string;
};

const COMMITMENTS_LIST_SHEET =
  "Commitments List";

const COMMITMENTS_LOG_SHEET =
  "Commitments Log";

const COMMITMENTS_LIST_RANGE =
  `${COMMITMENTS_LIST_SHEET}!A:Q`;

const COMMITMENTS_LOG_RANGE =
  `${COMMITMENTS_LOG_SHEET}!A:N`;

const MONTH_NAMES_MS = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember",
];

export class CommitmentService {

  private readonly transactionService:TransactionService;
  private readonly googleSettingsRepository:GoogleSettingsRepository;
  private readonly sheetsService:GoogleSheetsService;

  constructor(
    private readonly app:FastifyInstance,
  ){
    this.transactionService =
      new TransactionService(
        app,
      );

    this.googleSettingsRepository =
      new GoogleSettingsRepository(
        app.prisma,
      );

    this.sheetsService =
      new GoogleSheetsService(
        app,
      );
  }

  async listCommitments(
    actor:Actor,
    filter:CommitmentStatusFilter = "unpaid",
    now = new Date(),
  ){
    const membership =
      await this.requireWorkspaceMember(
        actor,
      );

    const period =
      this.periodFromDate(
        now,
      );

    const commitments =
      await this.readSheetCommitments(
        actor.workspaceId,
      );

    const rows =
      commitments
        .map((commitment) => {
          const status =
            this.resolveSheetCommitmentStatus(
              commitment,
              now,
            );

          const isActive =
            ![
              "INACTIVE",
              "ARCHIVED",
              "DELETED",
            ].includes(
              commitment.status,
            );

          return {
            id:
              commitment.id,
            workspaceId:
              commitment.workspaceId,
            ownerUserId:
              commitment.ownerUserId,
            name:
              commitment.name,
            amount:
              this.safeAmountText(
                commitment.amount,
              ),
            currency:
              commitment.currency,
            dueDay:
              commitment.dueDay,
            reminderDaysBefore:
              commitment.reminderDaysBefore,
            reminderTime:
              commitment.reminderTime,
            timezone:
              commitment.timezone,
            isActive:
              isActive,
            archivedAt:
              commitment.status === "ARCHIVED"
                ? commitment.updatedAt
                : null,
            canManage:
              this.canManageCommitment(
                membership.role,
                commitment.ownerUserId,
                actor.userId,
              ),
            currentMonth:{
              periodYear:
                period.year,
              periodMonth:
                period.month,
              monthLabel:
                this.monthLabel(
                  period.year,
                  period.month,
                ),
              instanceId:
                `sheet:${commitment.id}:${this.periodKey(period.year, period.month)}`,
              dueDate:
                this.parseSheetDate(
                  commitment.nextDueDate,
                )
                ??
                this.dueDateForPeriod(
                  period.year,
                  period.month,
                  commitment.dueDay,
                ),
              status:
                status,
              paidAt:
                commitment.lastPaidAt
                  ? new Date(commitment.lastPaidAt)
                  : null,
              reminderSentAt:
                null,
            },
            nextReminderAt:
              this.nextReminderDate({
                periodYear:
                  period.year,
                periodMonth:
                  period.month,
                dueDay:
                  commitment.dueDay,
                reminderDaysBefore:
                  commitment.reminderDaysBefore,
                reminderTime:
                  commitment.reminderTime,
              }),
          };
        })
        .filter((row) => {
          if(filter === "all"){
            return true;
          }
          if(filter === "inactive"){
            return !row.isActive || Boolean(row.archivedAt);
          }
          if(filter === "paid"){
            return row.currentMonth.status === "PAID";
          }
          if(filter === "overdue"){
            return row.currentMonth.status === "OVERDUE";
          }
          return [
            "PENDING",
            "OVERDUE",
          ].includes(
            row.currentMonth.status,
          ) && row.isActive && !row.archivedAt;
        });

    const totalUnpaid =
      rows
        .filter((row) => [
          "PENDING",
          "OVERDUE",
        ].includes(
          row.currentMonth.status,
        ))
        .reduce(
          (sum, row) => sum + this.amountNumber(row.amount),
          0,
        );

    return {
      period:{
        ...period,
        label:
          this.monthLabel(
            period.year,
            period.month,
          ),
      },
      filter,
      items:
        rows,
      summary:{
        total:
          rows.length,
        totalUnpaid:
          totalUnpaid.toFixed(2),
        currency:
          "MYR",
      },
    };
  }

  async createCommitment(
    actor:Actor,
    input:CreateCommitmentBody,
    now = new Date(),
  ){
    await this.requireWorkspaceMember(
      actor,
    );

    const settings =
      await this.getOrCreateBotSettings(
        actor.workspaceId,
      );

    const period =
      this.periodFromDate(
        now,
      );

    const commitment:SheetCommitment = {
      id:
        `cm${randomUUID().replaceAll("-", "")}`,
      workspaceId:
        actor.workspaceId,
      ownerUserId:
        actor.userId,
      ownerEmail:
        actor.email ?? "",
      name:
        input.name,
      amount:
        this.safeAmountText(
          input.amount,
        ),
      currency:
        "MYR",
      frequency:
        "MONTHLY",
      dueDay:
        input.dueDay,
      reminderDaysBefore:
        input.reminderDaysBefore ?? settings.defaultReminderDaysBefore,
      reminderTime:
        input.reminderTime ?? settings.defaultReminderTime,
      timezone:
        input.timezone ?? settings.timezone,
      status:
        input.isActive === false ? "INACTIVE" : "ACTIVE",
      currentPeriod:
        this.periodKey(
          period.year,
          period.month,
        ),
      nextDueDate:
        this.sheetDate(
          this.dueDateForPeriod(
            period.year,
            period.month,
            input.dueDay,
          ),
        ),
      lastPaidAt:
        "",
      createdAt:
        now.toISOString(),
      updatedAt:
        now.toISOString(),
    };

    await this.appendSheetCommitment(
      actor.workspaceId,
      commitment,
    );

    await this.appendSheetCommitmentLog(
      actor,
      "CREATE",
      commitment,
      now,
    );

    return this.getCommitment(
      actor,
      commitment.id,
      now,
    );
  }

  async updateCommitment(
    actor:Actor,
    commitmentId:string,
    input:UpdateCommitmentBody,
    now = new Date(),
  ){
    const current =
      await this.requireSheetCommitmentManageAccess(
        actor,
        commitmentId,
      );

    const period =
      this.periodFromDate(
        now,
      );

    const nextDueDay =
      input.dueDay ?? current.commitment.dueDay;

    const updated:SheetCommitment = {
      ...current.commitment,
      ...(input.name !== undefined ? { name:input.name } : {}),
      ...(input.amount !== undefined ? { amount:this.safeAmountText(input.amount) } : {}),
      ...(input.dueDay !== undefined ? { dueDay:input.dueDay } : {}),
      ...(input.reminderDaysBefore !== undefined ? { reminderDaysBefore:input.reminderDaysBefore } : {}),
      ...(input.reminderTime !== undefined ? { reminderTime:input.reminderTime } : {}),
      ...(input.timezone !== undefined ? { timezone:input.timezone } : {}),
      ...(input.isActive !== undefined
        ? {
            status:
              input.isActive ? "ACTIVE" : "INACTIVE",
          }
        : {}),
      currentPeriod:
        this.periodKey(
          period.year,
          period.month,
        ),
      nextDueDate:
        this.sheetDate(
          this.dueDateForPeriod(
            period.year,
            period.month,
            nextDueDay,
          ),
        ),
      updatedAt:
        now.toISOString(),
    };

    await this.updateSheetCommitmentRow(
      actor.workspaceId,
      current.rowNumber,
      updated,
    );

    await this.appendSheetCommitmentLog(
      actor,
      "UPDATE",
      updated,
      now,
    );

    return this.getCommitment(
      actor,
      updated.id,
      now,
    );
  }

  async archiveCommitment(
    actor:Actor,
    commitmentId:string,
    now = new Date(),
  ){
    const current =
      await this.requireSheetCommitmentManageAccess(
        actor,
        commitmentId,
      );

    const commitment = {
      ...current.commitment,
      status:
        "ARCHIVED",
      updatedAt:
        now.toISOString(),
    };

    await this.updateSheetCommitmentRow(
      actor.workspaceId,
      current.rowNumber,
      commitment,
    );

    await this.appendSheetCommitmentLog(
      actor,
      "ARCHIVE",
      commitment,
      now,
    );

    return {
      archived:true,
      id:
        current.commitment.id,
    };
  }

  async deleteCommitment(
    actor:Actor,
    commitmentId:string,
    now = new Date(),
  ){
    const current =
      await this.findSheetCommitment(
        actor.workspaceId,
        commitmentId,
      );

    if(!current?.commitment || current.commitment.status === "DELETED"){
      return this.deleteLegacyDatabaseCommitment(
        actor,
        commitmentId,
        now,
      );
    }

    const membership =
      await this.requireWorkspaceMember(
        actor,
      );

    if(
      !this.canManageCommitment(
        membership.role,
        current.commitment.ownerUserId,
        actor.userId,
      )
    ){
      throw new AppError(
        "INSUFFICIENT_ROLE",
        "You cannot manage this commitment",
        403,
      );
    }

    const receiptMarkers =
      this.commitmentReceiptMarkers(
        current.commitment,
      );


    let linkedTransactions:
      Awaited<
        ReturnType<
          TransactionService["bulkDeleteSheetTransactionsByReceiptMarkers"]
        >
      >
      |
      null =
        null;


    let linkedTransactionCleanupError:
      string
      |
      null =
        null;


    try{

      linkedTransactions =
        await this.transactionService
          .bulkDeleteSheetTransactionsByReceiptMarkers(
            actor.workspaceId,
            receiptMarkers,
          );

    }catch(error){

      linkedTransactionCleanupError =
        error instanceof Error
          ? error.message
          : "Failed to cleanup linked commitment transactions";

      console.error(
        "COMMITMENT_LINKED_TRANSACTION_CLEANUP_FAILED:",
        {
          workspaceId:
            actor.workspaceId,
          commitmentId:
            current.commitment.id,
          error,
        },
      );

    }


    const commitment = {
      ...current.commitment,
      status:
        "DELETED",
      updatedAt:
        now.toISOString(),
    };

    await this.updateSheetCommitmentRow(
      actor.workspaceId,
      current.rowNumber,
      commitment,
    );

    await this.appendSheetCommitmentLog(
      actor,
      "DELETE",
      commitment,
      now,
    );

    return {
      deleted:true,
      id:
        current.commitment.id,
      source:
        "GOOGLE_SHEET",
      linkedTransactions,
      linkedTransactionCleanupError,
    };
  }

  async markCurrentMonthPaid(
    actor:Actor,
    commitmentId:string,
    now = new Date(),
  ){
    const current =
      await this.requireSheetCommitmentManageAccess(
        actor,
        commitmentId,
      );

    const period =
      this.periodFromDate(
        now,
      );

    const paidAt =
      current.commitment.lastPaidAt
        ? new Date(current.commitment.lastPaidAt)
        : now;

    const commitment:SheetCommitment = {
      ...current.commitment,
      status:
        "PAID",
      currentPeriod:
        this.periodKey(
          period.year,
          period.month,
        ),
      lastPaidAt:
        paidAt.toISOString(),
      updatedAt:
        now.toISOString(),
    };

    await this.updateSheetCommitmentRow(
      actor.workspaceId,
      current.rowNumber,
      commitment,
    );

    const transaction =
      await this.ensurePaidCommitmentTransaction(
        actor,
        commitment,
        {
          id:
            this.commitmentTransactionMarker(
              commitment,
            ),
          dueDate:
            this.dueDateForPeriod(
              period.year,
              period.month,
              commitment.dueDay,
            ),
          paidAt,
        },
      );

    await this.appendSheetCommitmentLog(
      actor,
      "PAY",
      commitment,
      now,
      );

    return {
      commitmentId:
        commitment.id,
      instanceId:
        this.commitmentTransactionMarker(
          commitment,
        ),
      status:
        commitment.status,
      paidAt:
        paidAt,
      transactionId:
        transaction.id,
    };
  }

  private async ensurePaidCommitmentTransaction(
    actor:Actor,
    commitment:{
      id:string;
      name:string;
      amount:string;
      currency:string;
    },
    instance:{
      id:string;
      dueDate:Date;
      paidAt:Date | null;
    },
  ){
    const marker =
      instance.id.startsWith("commitment:")
        ? instance.id
        : `commitment:${instance.id}`;

    const transactionDate =
      instance.paidAt
      ??
      new Date();

    return this.transactionService.createTransaction(
      actor.role as
        | "OWNER"
        | "ADMIN"
        | "MEMBER"
        | "VIEWER",
      {
        workspaceId:
          actor.workspaceId,
        createdById:
          actor.userId,
        amount:
          commitment.amount.toString(),
        currency:
          commitment.currency,
        type:
          "EXPENSE",
        description:
          commitment.name,
        transactionDate,
        receiptUrl:
          marker,
        source:
          "COMMITMENT",
      },
    );
  }

  private async deleteLegacyDatabaseCommitment(
    actor:Actor,
    commitmentId:string,
    now = new Date(),
  ){
    const membership =
      await this.requireWorkspaceMember(
        actor,
      );

    const commitment =
      await this.app.prisma.commitment.findFirst({
        where:{
          id:
            commitmentId,
          workspaceId:
            actor.workspaceId,
        },
      });

    if(!commitment){
      throw new AppError(
        "COMMITMENT_NOT_FOUND",
        "Commitment not found",
        404,
      );
    }

    if(
      !this.canManageCommitment(
        membership.role,
        commitment.ownerUserId,
        actor.userId,
      )
    ){
      throw new AppError(
        "INSUFFICIENT_ROLE",
        "You cannot manage this commitment",
        403,
      );
    }

    const monthlyInstances =
      await this.app.prisma.monthlyCommitmentInstance.findMany({
        where:{
          commitmentId:
            commitment.id,

          workspaceId:
            actor.workspaceId,
        },
        select:{
          id:
            true,
        },
      });

    const receiptMarkers =
      monthlyInstances.map(
        (instance) =>
          `commitment:${instance.id}`,
      );

    let linkedTransactions:
      Awaited<
        ReturnType<
          TransactionService["bulkDeleteSheetTransactionsByReceiptMarkers"]
        >
      >
      |
      null =
        null;

    let linkedTransactionCleanupError:
      string
      |
      null =
        null;

    try{
      linkedTransactions =
        await this.transactionService
          .bulkDeleteSheetTransactionsByReceiptMarkers(
            actor.workspaceId,
            receiptMarkers,
          );
    }catch(error){
      linkedTransactionCleanupError =
        error instanceof Error
          ? error.message
          : "Failed to cleanup linked legacy commitment transactions";

      console.error(
        "LEGACY_COMMITMENT_LINKED_TRANSACTION_CLEANUP_FAILED:",
        {
          workspaceId:
            actor.workspaceId,
          commitmentId:
            commitment.id,
          error,
        },
      );
    }

    const period =
      this.periodFromDate(
        now,
      );

    const deletedCommitment:SheetCommitment = {
      id:
        commitment.id,
      workspaceId:
        commitment.workspaceId,
      ownerUserId:
        commitment.ownerUserId,
      ownerEmail:
        actor.email ?? "",
      name:
        commitment.name,
      amount:
        commitment.amount.toString(),
      currency:
        commitment.currency,
      frequency:
        "MONTHLY",
      dueDay:
        commitment.dueDay,
      reminderDaysBefore:
        commitment.reminderDaysBefore,
      reminderTime:
        commitment.reminderTime,
      timezone:
        commitment.timezone,
      status:
        "DELETED",
      currentPeriod:
        this.periodKey(
          period.year,
          period.month,
        ),
      nextDueDate:
        this.sheetDate(
          this.dueDateForPeriod(
            period.year,
            period.month,
            commitment.dueDay,
          ),
        ),
      lastPaidAt:
        "",
      createdAt:
        commitment.createdAt.toISOString(),
      updatedAt:
        now.toISOString(),
    };

    await this.appendSheetCommitment(
      actor.workspaceId,
      deletedCommitment,
    );

    await this.appendSheetCommitmentLog(
      actor,
      "DELETE",
      deletedCommitment,
      now,
    );

    await this.app.prisma.commitment.delete({
      where:{
        id:
          commitment.id,
      },
    });

    return {
      deleted:
        true,
      id:
        commitment.id,
      source:
        "LEGACY_DATABASE",
      linkedTransactions,
      linkedTransactionCleanupError,
    };
  }




  async getBotSettings(
    actor:Actor,
  ){
    await this.requireWorkspaceMember(
      actor,
    );

    return this.getOrCreateBotSettings(
      actor.workspaceId,
    );
  }

  async updateBotSettings(
    actor:Actor,
    input:BotSettingsBody,
  ){
    const membership =
      await this.requireWorkspaceMember(
        actor,
      );

    if(!this.isOwnerOrAdmin(membership.role)){
      throw new AppError(
        "INSUFFICIENT_ROLE",
        "Only Owner/Admin can update bot settings",
        403,
      );
    }

    return this.app.prisma.workspaceBotSettings.upsert({
      where:{
        workspaceId:
          actor.workspaceId,
      },
      create:{
        workspaceId:
          actor.workspaceId,
        botEnabled:
          input.botEnabled ?? true,
        replyLanguage:
          input.replyLanguage ?? "ms",
        timezone:
          input.timezone ?? "Asia/Kuala_Lumpur",
        defaultReminderDaysBefore:
          input.defaultReminderDaysBefore ?? 2,
        defaultReminderTime:
          input.defaultReminderTime ?? "09:00",
        quietHoursStart:
          input.quietHoursStart ?? "22:00",
        quietHoursEnd:
          input.quietHoursEnd ?? "08:00",
        overdueReminderEnabled:
          input.overdueReminderEnabled ?? true,
        whatsappNotificationEnabled:
          input.whatsappNotificationEnabled ?? true,
      },
      update:{
        ...input,
      },
    });
  }

  async getCommitment(
    actor:Actor,
    commitmentId:string,
    now = new Date(),
  ){
    await this.requireWorkspaceMember(
      actor,
    );

    const current =
      await this.findSheetCommitment(
        actor.workspaceId,
        commitmentId,
      );

    const commitment =
      current?.commitment
      ?? null;

    if(!commitment){
      throw new AppError(
        "COMMITMENT_NOT_FOUND",
        "Commitment not found",
        404,
      );
    }

    const period =
      this.periodFromDate(
        now,
      );

    return {
      ...commitment,
      amount:
        this.safeAmountText(
          commitment.amount,
        ),
      monthlyInstances:
        [
          {
            id:
              this.commitmentTransactionMarker(
                commitment,
              ),
            workspaceId:
              commitment.workspaceId,
            commitmentId:
              commitment.id,
            periodYear:
              period.year,
            periodMonth:
              period.month,
            dueDate:
              this.parseSheetDate(
                commitment.nextDueDate,
              )
              ??
              this.dueDateForPeriod(
                period.year,
                period.month,
                commitment.dueDay,
              ),
            status:
              this.resolveSheetCommitmentStatus(
                commitment,
                now,
              ),
            paidAt:
              commitment.lastPaidAt
                ? new Date(commitment.lastPaidAt)
                : null,
            reminderSentAt:
              null,
          },
        ],
    };
  }

  async ensureCurrentMonthInstances(
    workspaceId:string,
    actorUserId:string,
    now = new Date(),
  ){
    void now;

    await this.readSheetCommitments(
      workspaceId,
    );

    return {
      createdOrExisting:
        0,
      actorUserId,
      source:
        "GOOGLE_SHEET",
    };
  }

  private async readSheetCommitments(
    workspaceId:string,
  ):Promise<SheetCommitment[]>{
    const setting =
      await this.googleSettingsRepository
        .findByWorkspaceId(
          workspaceId,
        );

    if(!setting?.spreadsheetId){
      throw new AppError(
        "GOOGLE_SHEET_REQUIRED",
        "Commitments are stored in Google Sheet. Please connect Google Sheet first.",
        400,
      );
    }

    const [
      rows,
      logAmountByCommitmentId,
    ] =
      await Promise.all([
        this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                setting.spreadsheetId,
              range:
                COMMITMENTS_LIST_RANGE,
              valueRenderOption:
                "UNFORMATTED_VALUE",
            },
          ),
        this.readSheetCommitmentLogAmounts(
          workspaceId,
          setting.spreadsheetId,
        ),
      ]);

    const parsedRows =
      rows
        .slice(1)
        .map((row, index) => {
          const commitment =
            this.parseSheetCommitmentRow(
              row,
              logAmountByCommitmentId,
            );

          return commitment
            ? {
              commitment,
              rowNumber:
                index + 2,
              rawAmount:
                String(row[3] ?? "").trim(),
            }
            : null;
        })
        .filter((row): row is {
          commitment:SheetCommitment;
          rowNumber:number;
          rawAmount:string;
        } => Boolean(row))
        .filter((row) =>
          row.commitment.workspaceId === workspaceId
          &&
          row.commitment.status !== "DELETED",
        );

    await Promise.all(
      parsedRows
        .filter((row) =>
          this.isBrokenSheetAmount(
            row.rawAmount,
          )
          &&
          this.amountNumber(
            row.commitment.amount,
          ) > 0
        )
        .map((row) =>
          this.updateSheetCommitmentRow(
            workspaceId,
            row.rowNumber,
            row.commitment,
          ),
        ),
    );

    return parsedRows
      .map((row) => row.commitment)
      .filter((row): row is SheetCommitment => Boolean(row))
      .filter((row) =>
        row.workspaceId === workspaceId
        &&
        row.status !== "DELETED",
      )
      .sort((left, right) =>
        left.dueDay - right.dueDay
        ||
        left.name.localeCompare(right.name),
      );
  }

  private async findSheetCommitment(
    workspaceId:string,
    commitmentId:string,
  ){
    const setting =
      await this.googleSettingsRepository
        .findByWorkspaceId(
          workspaceId,
        );

    if(!setting?.spreadsheetId){
      throw new AppError(
        "GOOGLE_SHEET_REQUIRED",
        "Commitments are stored in Google Sheet. Please connect Google Sheet first.",
        400,
      );
    }

    const [
      rows,
      logAmountByCommitmentId,
    ] =
      await Promise.all([
        this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                setting.spreadsheetId,
              range:
                COMMITMENTS_LIST_RANGE,
              valueRenderOption:
                "UNFORMATTED_VALUE",
            },
          ),
        this.readSheetCommitmentLogAmounts(
          workspaceId,
          setting.spreadsheetId,
        ),
      ]);

    for(let index = 1; index < rows.length; index += 1){
      const commitment =
        this.parseSheetCommitmentRow(
          rows[index],
          logAmountByCommitmentId,
        );

      if(
        commitment?.id === commitmentId
        &&
        commitment.workspaceId === workspaceId
      ){
        return {
          commitment,
          rowNumber:
            index + 1,
          spreadsheetId:
            setting.spreadsheetId,
        };
      }
    }

    return null;
  }

  private parseSheetCommitmentRow(
    row:unknown[],
    logAmountByCommitmentId = new Map<string, string>(),
  ):SheetCommitment | null{
    const valueAt =
      (index:number) =>
        String(row[index] ?? "").trim();

    const id =
      valueAt(0);

    if(!id.startsWith("cm")){
      return null;
    }

    const amount =
      this.normalizeAmount(
        valueAt(3),
      )
      ||
      logAmountByCommitmentId.get(id)
      ||
      this.normalizeAmount(
        valueAt(2),
      )
      ||
      "0";

    return {
      id,
      workspaceId:
        valueAt(1),
      name:
        valueAt(2),
      amount:
        amount,
      frequency:
        valueAt(4) || "MONTHLY",
      dueDay:
        this.toInteger(valueAt(5), 1),
      reminderDaysBefore:
        this.toInteger(valueAt(6), 2),
      reminderTime:
        valueAt(7) || "09:00",
      timezone:
        valueAt(8) || "Asia/Kuala_Lumpur",
      status:
        (valueAt(9) || "ACTIVE").toUpperCase(),
      currentPeriod:
        valueAt(10),
      nextDueDate:
        valueAt(11),
      lastPaidAt:
        valueAt(12),
      ownerUserId:
        valueAt(13),
      ownerEmail:
        valueAt(14),
      currency:
        "MYR",
      createdAt:
        valueAt(15),
      updatedAt:
        valueAt(16),
    };
  }

  private async appendSheetCommitment(
    workspaceId:string,
    commitment:SheetCommitment,
  ){
    const setting =
      await this.requireGoogleSheetSetting(
        workspaceId,
      );

    await this.sheetsService
      .appendRow(
        workspaceId,
        {
          spreadsheetId:
            setting.spreadsheetId,
          range:
            COMMITMENTS_LIST_RANGE,
          values:
            this.sheetCommitmentValues(
              commitment,
            ),
          valueInputOption:
            "RAW",
        },
      );

    const current =
      await this.findSheetCommitment(
        workspaceId,
        commitment.id,
      );

    if(current){
      await this.updateSheetCommitmentRow(
        workspaceId,
        current.rowNumber,
        commitment,
      );
    }
  }

  private async updateSheetCommitmentRow(
    workspaceId:string,
    rowNumber:number,
    commitment:SheetCommitment,
  ){
    const setting =
      await this.requireGoogleSheetSetting(
        workspaceId,
      );

    await this.sheetsService
      .updateRange(
        workspaceId,
        {
          spreadsheetId:
            setting.spreadsheetId,
          range:
            `${COMMITMENTS_LIST_SHEET}!A${rowNumber}:Q${rowNumber}`,
          values:[
            this.sheetCommitmentValues(
              commitment,
            ),
          ],
          valueInputOption:
            "RAW",
        },
      );

    await this.safeFormatCommitmentAmountCell(
      workspaceId,
      setting.spreadsheetId,
      COMMITMENTS_LIST_SHEET,
      rowNumber,
      3,
    );
  }

  private async appendSheetCommitmentLog(
    actor:Actor,
    action:string,
    commitment:SheetCommitment,
    now:Date,
  ){
    const setting =
      await this.requireGoogleSheetSetting(
        actor.workspaceId,
      );

    const appendResult =
      await this.sheetsService
        .appendRow(
          actor.workspaceId,
          {
            spreadsheetId:
              setting.spreadsheetId,
            range:
              COMMITMENTS_LOG_RANGE,
            values:[
              `cl${randomUUID().replaceAll("-", "")}`,
              commitment.id,
              action,
              now.toISOString(),
              commitment.currentPeriod,
              this.amountNumber(
                commitment.amount,
              ),
              "",
              commitment.status,
              "DASHBOARD",
              "",
              actor.userId,
              actor.email ?? "",
              "SYNCED",
              commitment.name,
            ],
            valueInputOption:
              "RAW",
          },
        );

    const rowNumber =
      this.rowNumberFromUpdatedRange(
        appendResult.updatedRange,
      );

    if(rowNumber){
      await this.safeFormatCommitmentAmountCell(
        actor.workspaceId,
        setting.spreadsheetId,
        COMMITMENTS_LOG_SHEET,
        rowNumber,
        5,
      );
    }
  }

  private async readSheetCommitmentLogAmounts(
    workspaceId:string,
    spreadsheetId:string,
  ){
    const rows =
      await this.sheetsService
        .readRange(
          workspaceId,
          {
            spreadsheetId,
            range:
              COMMITMENTS_LOG_RANGE,
            valueRenderOption:
              "UNFORMATTED_VALUE",
          },
        );

    const amountByCommitmentId =
      new Map<string, string>();

    for(const row of rows.slice(1)){
      const valueAt =
        (index:number) =>
          String(row[index] ?? "").trim();

      const commitmentId =
        valueAt(1).startsWith("cm")
          ? valueAt(1)
          : valueAt(3);

      if(!commitmentId.startsWith("cm")){
        continue;
      }

      const amount =
        this.normalizeAmount(
          valueAt(5),
        )
        ||
        this.normalizeAmount(
          valueAt(6),
        )
        ||
        this.normalizeAmount(
          valueAt(7),
        );

      if(amount){
        amountByCommitmentId.set(
          commitmentId,
          amount,
        );
      }
    }

    return amountByCommitmentId;
  }

  private async safeFormatCommitmentAmountCell(
    workspaceId:string,
    spreadsheetId:string,
    sheetName:string,
    rowNumber:number,
    columnIndex:number,
  ){
    try{
      await this.sheetsService
        .formatNumberRange(
          workspaceId,
          {
            spreadsheetId,
            sheetName,
            startRowIndex:
              rowNumber - 1,
            endRowIndex:
              rowNumber,
            startColumnIndex:
              columnIndex,
            endColumnIndex:
              columnIndex + 1,
            pattern:
              "#,##0.00",
          },
        );
    }catch(error){
      console.error(
        "COMMITMENT_AMOUNT_FORMAT_FAILED",
        {
          workspaceId,
          spreadsheetId,
          sheetName,
          rowNumber,
          columnIndex,
          error,
        },
      );
    }
  }

  private rowNumberFromUpdatedRange(
    updatedRange:string,
  ){
    const match =
      updatedRange.match(
        /![A-Z]+(\d+):/i,
      );

    if(!match?.[1]){
      return null;
    }

    const rowNumber =
      Number.parseInt(
        match[1],
        10,
      );

    return Number.isFinite(rowNumber)
      ? rowNumber
      : null;
  }

  private sheetCommitmentValues(
    commitment:SheetCommitment,
  ){
    return [
      commitment.id,
      commitment.workspaceId,
      commitment.name,
      this.amountNumber(
        commitment.amount,
      ),
      commitment.frequency,
      String(commitment.dueDay),
      String(commitment.reminderDaysBefore),
      commitment.reminderTime,
      commitment.timezone,
      commitment.status,
      commitment.currentPeriod,
      commitment.nextDueDate,
      commitment.lastPaidAt,
      commitment.ownerUserId,
      commitment.ownerEmail,
      commitment.createdAt,
      commitment.updatedAt,
    ];
  }

  private async requireGoogleSheetSetting(
    workspaceId:string,
  ){
    const setting =
      await this.googleSettingsRepository
        .findByWorkspaceId(
          workspaceId,
        );

    if(!setting?.spreadsheetId){
      throw new AppError(
        "GOOGLE_SHEET_REQUIRED",
        "Commitments are stored in Google Sheet. Please connect Google Sheet first.",
        400,
      );
    }

    return {
      spreadsheetId:
        setting.spreadsheetId,
    };
  }

  private async requireSheetCommitmentManageAccess(
    actor:Actor,
    commitmentId:string,
  ){
    const membership =
      await this.requireWorkspaceMember(
        actor,
      );

    const current =
      await this.findSheetCommitment(
        actor.workspaceId,
        commitmentId,
      );

    if(!current?.commitment || current.commitment.status === "DELETED"){
      throw new AppError(
        "COMMITMENT_NOT_FOUND",
        "Commitment not found",
        404,
      );
    }

    if(
      !this.canManageCommitment(
        membership.role,
        current.commitment.ownerUserId,
        actor.userId,
      )
    ){
      throw new AppError(
        "INSUFFICIENT_ROLE",
        "You cannot manage this commitment",
        403,
      );
    }

    return current;
  }

  private resolveSheetCommitmentStatus(
    commitment:SheetCommitment,
    now:Date,
  ){
    const period =
      this.periodFromDate(
        now,
      );

    if(
      commitment.status === "PAID"
      &&
      commitment.currentPeriod === this.periodKey(
        period.year,
        period.month,
      )
    ){
      return "PAID";
    }

    if(
      [
        "ARCHIVED",
        "INACTIVE",
        "DELETED",
      ].includes(commitment.status)
    ){
      return commitment.status;
    }

    const dueDate =
      this.parseSheetDate(
        commitment.nextDueDate,
      );

    if(
      dueDate
      &&
      dueDate.getTime() < this.startOfDay(now).getTime()
    ){
      return "OVERDUE";
    }

    return "PENDING";
  }

  private commitmentTransactionMarker(
    commitment:SheetCommitment,
  ){
    return `commitment:${commitment.id}:${commitment.currentPeriod}`;
  }

  private commitmentReceiptMarkers(
    commitment:SheetCommitment,
  ){
    return [
      this.commitmentTransactionMarker(
        commitment,
      ),
      `commitment:${commitment.id}`,
    ];
  }

  private periodKey(
    year:number,
    month:number,
  ){
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  private sheetDate(
    date:Date,
  ){
    return date
      .toISOString()
      .slice(0, 10);
  }

  private parseSheetDate(
    value:string,
  ){
    if(!value){
      return null;
    }

    const parsed =
      new Date(value);

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }

  private toInteger(
    value:string,
    fallback:number,
  ){
    const parsed =
      Number.parseInt(
        value,
        10,
      );

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  private normalizeAmount(
    value:string,
  ){
    const match =
      value
        .replace(/,/g, "")
        .match(
          /([0-9]+(?:\.[0-9]{1,2})?)/,
        );

    if(!match?.[1]){
      return "";
    }

    const amount =
      Number(
        match[1],
      );

    return Number.isFinite(amount)
      ? amount.toFixed(2)
      : "";
  }

  private amountNumber(
    value:string,
  ){
    const amount =
      Number(
        this.normalizeAmount(
          value,
        )
        ||
        value,
      );

    return Number.isFinite(amount)
      ? amount
      : 0;
  }

  private safeAmountText(
    value:string,
  ){
    return this.normalizeAmount(
      value,
    )
    ||
    "0.00";
  }

  private isBrokenSheetAmount(
    value:string,
  ){
    return (
      !this.normalizeAmount(
        value,
      )
      &&
      (
        value === ""
        ||
        value.includes(
          "#",
        )
        ||
        value.toLowerCase().includes(
          "nan",
        )
      )
    );
  }

  private async getOrCreateBotSettings(
    workspaceId:string,
  ){
    return this.app.prisma.workspaceBotSettings.upsert({
      where:{
        workspaceId,
      },
      create:{
        workspaceId,
      },
      update:{},
    });
  }

  private async requireWorkspaceMember(
    actor:Actor,
  ){
    const membership =
      await this.app.prisma.workspaceMember.findFirst({
        where:{
          userId:
            actor.userId,
          workspaceId:
            actor.workspaceId,
        },
      });

    if(!membership){
      throw new AppError(
        "WORKSPACE_ACCESS_DENIED",
        "Workspace access denied",
        403,
      );
    }

    return membership;
  }

  private canManageCommitment(
    role:string,
    ownerUserId:string,
    actorUserId:string,
  ){
    return this.isOwnerOrAdmin(role)
      || ownerUserId === actorUserId;
  }

  private isOwnerOrAdmin(
    role:string,
  ){
    return role === "OWNER"
      || role === "ADMIN";
  }

  private periodFromDate(
    date:Date,
  ){
    return {
      year:
        date.getFullYear(),
      month:
        date.getMonth() + 1,
    };
  }

  private dueDateForPeriod(
    year:number,
    month:number,
    dueDay:number,
  ){
    const lastDay =
      new Date(
        year,
        month,
        0,
      ).getDate();

    return new Date(
      year,
      month - 1,
      Math.min(
        dueDay,
        lastDay,
      ),
      0,
      0,
      0,
      0,
    );
  }

  private nextReminderDate(
    input:{
      periodYear:number;
      periodMonth:number;
      dueDay:number;
      reminderDaysBefore:number;
      reminderTime:string;
    },
  ){
    const dueDate =
      this.dueDateForPeriod(
        input.periodYear,
        input.periodMonth,
        input.dueDay,
      );

    const [hour, minute] =
      input.reminderTime
        .split(":")
        .map(Number);

    const reminderAt =
      new Date(
        dueDate,
      );

    reminderAt.setDate(
      reminderAt.getDate() - input.reminderDaysBefore,
    );
    reminderAt.setHours(
      hour ?? 9,
      minute ?? 0,
      0,
      0,
    );

    return reminderAt;
  }

  private startOfDay(
    date:Date,
  ){
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
  }

  private monthLabel(
    year:number,
    month:number,
  ){
    return `${MONTH_NAMES_MS[month - 1]} ${year}`;
  }

}
