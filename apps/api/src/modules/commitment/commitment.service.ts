import type {
  FastifyInstance,
} from "fastify";

import {
  AppError,
} from "../../shared/errors/index.js";

import type {
  BotSettingsBody,
  CreateCommitmentBody,
  UpdateCommitmentBody,
} from "./commitment.schemas.js";

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

  constructor(
    private readonly app:FastifyInstance,
  ){}

  async listCommitments(
    actor:Actor,
    filter:CommitmentStatusFilter = "unpaid",
    now = new Date(),
  ){
    const membership =
      await this.requireWorkspaceMember(
        actor,
      );

    await this.ensureCurrentMonthInstances(
      actor.workspaceId,
      actor.userId,
      now,
    );

    await this.markOverdue(
      actor.workspaceId,
      now,
    );

    const period =
      this.periodFromDate(
        now,
      );

    const commitments =
      await this.app.prisma.commitment.findMany({
        where:{
          workspaceId:
            actor.workspaceId,

          ...(filter === "inactive"
            ? {
                OR:[
                  { isActive:false },
                  { archivedAt:{ not:null } },
                ],
              }
            : {}),

          ...(filter !== "inactive" && filter !== "all"
            ? {
                archivedAt:null,
              }
            : {}),
        },
        include:{
          monthlyInstances:{
            where:{
              periodYear:
                period.year,
              periodMonth:
                period.month,
            },
            orderBy:{
              dueDate:
                "asc",
            },
          },
        },
        orderBy:[
          { dueDay:"asc" },
          { name:"asc" },
        ],
      });

    const rows =
      commitments
        .map((commitment) => {
          const instance =
            commitment.monthlyInstances[0]
            ?? null;

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
              commitment.amount.toString(),
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
              commitment.isActive,
            archivedAt:
              commitment.archivedAt,
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
                instance?.id ?? null,
              dueDate:
                instance?.dueDate ?? this.dueDateForPeriod(
                  period.year,
                  period.month,
                  commitment.dueDay,
                ),
              status:
                instance?.status ?? "PENDING",
              paidAt:
                instance?.paidAt ?? null,
              reminderSentAt:
                instance?.reminderSentAt ?? null,
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
          (sum, row) => sum + Number(row.amount),
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

    const commitment =
      await this.app.prisma.commitment.create({
        data:{
          workspaceId:
            actor.workspaceId,
          ownerUserId:
            actor.userId,
          name:
            input.name,
          amount:
            input.amount,
          dueDay:
            input.dueDay,
          reminderDaysBefore:
            input.reminderDaysBefore ?? settings.defaultReminderDaysBefore,
          reminderTime:
            input.reminderTime ?? settings.defaultReminderTime,
          timezone:
            input.timezone ?? settings.timezone,
          isActive:
            input.isActive ?? true,
          createdById:
            actor.userId,
          updatedById:
            actor.userId,
        },
      });

    await this.ensureInstanceForCommitment(
      commitment.id,
      actor.workspaceId,
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
    const commitment =
      await this.requireCommitmentManageAccess(
        actor,
        commitmentId,
      );

    const updated =
      await this.app.prisma.commitment.update({
        where:{
          id:
            commitment.id,
        },
        data:{
          ...(input.name !== undefined ? { name:input.name } : {}),
          ...(input.amount !== undefined ? { amount:input.amount } : {}),
          ...(input.dueDay !== undefined ? { dueDay:input.dueDay } : {}),
          ...(input.reminderDaysBefore !== undefined ? { reminderDaysBefore:input.reminderDaysBefore } : {}),
          ...(input.reminderTime !== undefined ? { reminderTime:input.reminderTime } : {}),
          ...(input.timezone !== undefined ? { timezone:input.timezone } : {}),
          ...(input.isActive !== undefined ? { isActive:input.isActive } : {}),
          updatedById:
            actor.userId,
        },
      });

    const period =
      this.periodFromDate(
        now,
      );

    if(input.dueDay !== undefined){
      await this.app.prisma.monthlyCommitmentInstance.updateMany({
        where:{
          commitmentId:
            updated.id,
          workspaceId:
            actor.workspaceId,
          periodYear:
            period.year,
          periodMonth:
            period.month,
          status:{
            in:[
              "PENDING",
              "OVERDUE",
            ],
          },
        },
        data:{
          dueDate:
            this.dueDateForPeriod(
              period.year,
              period.month,
              updated.dueDay,
            ),
        },
      });
    }

    await this.ensureInstanceForCommitment(
      updated.id,
      actor.workspaceId,
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
    const commitment =
      await this.requireCommitmentManageAccess(
        actor,
        commitmentId,
      );

    await this.app.prisma.commitment.update({
      where:{
        id:
          commitment.id,
      },
      data:{
        isActive:false,
        archivedAt:
          now,
        updatedById:
          actor.userId,
      },
    });

    return {
      archived:true,
      id:
        commitment.id,
    };
  }

  async markCurrentMonthPaid(
    actor:Actor,
    commitmentId:string,
    now = new Date(),
  ){
    const commitment =
      await this.requireCommitmentManageAccess(
        actor,
        commitmentId,
      );

    const instance =
      await this.ensureInstanceForCommitment(
        commitment.id,
        actor.workspaceId,
        now,
      );

    const updated =
      await this.app.prisma.monthlyCommitmentInstance.update({
        where:{
          id:
            instance.id,
        },
        data:{
          status:
            "PAID",
          paidAt:
            now,
        },
      });

    return {
      commitmentId:
        commitment.id,
      instanceId:
        updated.id,
      status:
        updated.status,
      paidAt:
        updated.paidAt,
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

    await this.ensureInstanceForCommitment(
      commitmentId,
      actor.workspaceId,
      now,
    );

    const commitment =
      await this.app.prisma.commitment.findFirst({
        where:{
          id:
            commitmentId,
          workspaceId:
            actor.workspaceId,
        },
        include:{
          monthlyInstances:{
            orderBy:{
              dueDate:
                "desc",
            },
            take:3,
          },
        },
      });

    if(!commitment){
      throw new AppError(
        "COMMITMENT_NOT_FOUND",
        "Commitment not found",
        404,
      );
    }

    return {
      ...commitment,
      amount:
        commitment.amount.toString(),
      monthlyInstances:
        commitment.monthlyInstances.map((instance) => ({
          ...instance,
        })),
    };
  }

  async ensureCurrentMonthInstances(
    workspaceId:string,
    actorUserId:string,
    now = new Date(),
  ){
    const commitments =
      await this.app.prisma.commitment.findMany({
        where:{
          workspaceId,
          isActive:true,
          archivedAt:null,
        },
      });

    const instances = [];

    for(const commitment of commitments){
      instances.push(
        await this.ensureInstanceForCommitment(
          commitment.id,
          workspaceId,
          now,
        ),
      );
    }

    return {
      createdOrExisting:
        instances.length,
      actorUserId,
    };
  }

  private async ensureInstanceForCommitment(
    commitmentId:string,
    workspaceId:string,
    now = new Date(),
  ){
    const commitment =
      await this.app.prisma.commitment.findFirst({
        where:{
          id:
            commitmentId,
          workspaceId,
        },
      });

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

    return this.app.prisma.monthlyCommitmentInstance.upsert({
      where:{
        commitmentId_periodYear_periodMonth:{
          commitmentId:
            commitment.id,
          periodYear:
            period.year,
          periodMonth:
            period.month,
        },
      },
      create:{
        commitmentId:
          commitment.id,
        workspaceId,
        periodYear:
          period.year,
        periodMonth:
          period.month,
        dueDate:
          this.dueDateForPeriod(
            period.year,
            period.month,
            commitment.dueDay,
          ),
      },
      update:{},
    });
  }

  private async markOverdue(
    workspaceId:string,
    now:Date,
  ){
    await this.app.prisma.monthlyCommitmentInstance.updateMany({
      where:{
        workspaceId,
        status:
          "PENDING",
        dueDate:{
          lt:
            this.startOfDay(
              now,
            ),
        },
      },
      data:{
        status:
          "OVERDUE",
      },
    });
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

  private async requireCommitmentManageAccess(
    actor:Actor,
    commitmentId:string,
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

    return commitment;
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
