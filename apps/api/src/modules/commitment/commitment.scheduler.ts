import type {
  FastifyInstance,
} from "fastify";

import {
  env,
} from "../../config/index.js";

const POLL_INTERVAL_MS = 60_000;
const CLAIM_TTL_MS = 5 * 60_000;

export class CommitmentScheduler {

  private timer:NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly app:FastifyInstance,
  ){}

  start(){
    if(this.timer){
      return;
    }

    this.timer =
      setInterval(
        () => {
          void this.tick().catch((error) => {
            this.app.log.error(
              { error },
              "COMMITMENT_SCHEDULER_TICK_FAILED",
            );
          });
        },
        POLL_INTERVAL_MS,
      );

    this.timer.unref?.();

    void this.tick().catch((error) => {
      this.app.log.error(
        { error },
        "COMMITMENT_SCHEDULER_STARTUP_TICK_FAILED",
      );
    });
  }

  stop(){
    if(this.timer){
      clearInterval(
        this.timer,
      );
      this.timer = null;
    }
  }

  async tick(
    now = new Date(),
  ){
    if(this.running){
      return {
        skipped:true,
        reason:"ALREADY_RUNNING",
      };
    }

    this.running = true;

    try{
      await this.createDueDeliveries(
        now,
      );

      await this.markOverdue(
        now,
      );

      const dueDeliveries =
        await this.app.prisma.commitmentReminderDelivery.findMany({
          where:{
            status:{
              in:[
                "PENDING",
                "FAILED",
              ],
            },
            scheduledFor:{
              lte:
                now,
            },
            OR:[
              { nextAttemptAt:null },
              { nextAttemptAt:{ lte:now } },
            ],
            attemptCount:{
              lt:3,
            },
          },
          include:{
            workspace:{
              include:{
                whatsapp:true,
                botSettings:true,
                members:{
                  include:{
                    user:true,
                  },
                },
              },
            },
            monthlyCommitment:{
              include:{
                commitment:true,
              },
            },
          },
          orderBy:{
            scheduledFor:"asc",
          },
          take:10,
        });

      let sent = 0;
      let failed = 0;

      for(const delivery of dueDeliveries){
        const result =
          await this.processDelivery(
            delivery,
            now,
          );

        if(result === "SENT"){
          sent += 1;
        }
        if(result === "FAILED"){
          failed += 1;
        }
      }

      return {
        sent,
        failed,
        checked:
          dueDeliveries.length,
      };
    }finally{
      this.running = false;
    }
  }

  private async createDueDeliveries(
    now:Date,
  ){
    const period = {
      year:
        now.getFullYear(),
      month:
        now.getMonth() + 1,
    };

    const instances =
      await this.app.prisma.monthlyCommitmentInstance.findMany({
        where:{
          periodYear:
            period.year,
          periodMonth:
            period.month,
          status:
            "PENDING",
          commitment:{
            isActive:true,
            archivedAt:null,
          },
        },
        include:{
          commitment:true,
          workspace:{
            include:{
              botSettings:true,
            },
          },
        },
      });

    for(const instance of instances){
      const settings =
        instance.workspace.botSettings;

      if(settings && (!settings.botEnabled || !settings.whatsappNotificationEnabled)){
        continue;
      }

      const reminderAt =
        this.reminderAt(
          instance.dueDate,
          instance.commitment.reminderDaysBefore,
          instance.commitment.reminderTime,
        );

      const scheduledFor =
        settings
          ? this.applyQuietHours(
              reminderAt,
              settings.quietHoursStart,
              settings.quietHoursEnd,
            )
          : reminderAt;

      if(scheduledFor > now){
        continue;
      }

      await this.app.prisma.commitmentReminderDelivery.upsert({
        where:{
          monthlyCommitmentId_kind:{
            monthlyCommitmentId:
              instance.id,
            kind:
              "DUE",
          },
        },
        create:{
          monthlyCommitmentId:
            instance.id,
          workspaceId:
            instance.workspaceId,
          kind:
            "DUE",
          idempotencyKey:
            `${instance.id}:DUE`,
          scheduledFor,
          nextAttemptAt:
            scheduledFor,
        },
        update:{},
      });
    }
  }

  private async markOverdue(
    now:Date,
  ){
    await this.app.prisma.monthlyCommitmentInstance.updateMany({
      where:{
        status:"PENDING",
        dueDate:{
          lt:
            new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              0,
              0,
              0,
              0,
            ),
        },
      },
      data:{
        status:"OVERDUE",
      },
    });
  }

  private async processDelivery(
    delivery:any,
    now:Date,
  ){
    const settings =
      delivery.workspace.botSettings;

    if(settings && (!settings.botEnabled || !settings.whatsappNotificationEnabled)){
      await this.app.prisma.commitmentReminderDelivery.update({
        where:{ id:delivery.id },
        data:{
          status:"CANCELLED",
          lastErrorCode:"BOT_DISABLED",
          lastErrorMessage:"Bot or WhatsApp notifications disabled",
        },
      });
      return "FAILED";
    }

    const claimToken =
      `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const claimed =
      await this.app.prisma.commitmentReminderDelivery.updateMany({
        where:{
          id:
            delivery.id,
          status:{
            in:[
              "PENDING",
              "FAILED",
            ],
          },
          OR:[
            { claimExpiresAt:null },
            { claimExpiresAt:{ lt:now } },
          ],
        },
        data:{
          status:"SENDING",
          claimedAt:now,
          claimToken,
          claimExpiresAt:new Date(now.getTime() + CLAIM_TTL_MS),
          attemptCount:{ increment:1 },
          lastAttemptAt:now,
        },
      });

    if(claimed.count !== 1){
      return "SKIPPED";
    }

    try{
      const instance =
        delivery.workspace.whatsapp.find((item:any) =>
          String(item.status || "").toUpperCase() === "CONNECTED"
        )
        ??
        delivery.workspace.whatsapp[0];

      const member =
        delivery.workspace.members.find((item:any) =>
          item.userId === delivery.monthlyCommitment.commitment.ownerUserId &&
          item.whatsappPhoneNumber
        )
        ??
        delivery.workspace.members.find((item:any) => item.whatsappPhoneNumber);

      if(!instance || !member?.whatsappPhoneNumber){
        throw new Error("ACTIVE_WHATSAPP_INSTANCE_OR_RECIPIENT_NOT_FOUND");
      }

      const message =
        this.buildReminderMessage(
          delivery,
        );

      const providerMessageId =
        await this.sendEvolutionText(
          instance.instanceName,
          member.whatsappPhoneNumber,
          message,
        );

      await this.app.prisma.commitmentReminderDelivery.update({
        where:{ id:delivery.id },
        data:{
          status:"SENT",
          recipientPhone:member.whatsappPhoneNumber,
          providerMessageId,
          sentAt:new Date(),
          lastErrorCode:null,
          lastErrorMessage:null,
          claimToken:null,
          claimExpiresAt:null,
        },
      });

      await this.app.prisma.monthlyCommitmentInstance.update({
        where:{ id:delivery.monthlyCommitmentId },
        data:{
          reminderSentAt:new Date(),
          lastReminderKey:delivery.idempotencyKey,
        },
      });

      return "SENT";
    }catch(error){
      const attemptCount =
        delivery.attemptCount + 1;

      await this.app.prisma.commitmentReminderDelivery.update({
        where:{ id:delivery.id },
        data:{
          status:
            attemptCount >= delivery.maxAttempts
              ? "FAILED"
              : "PENDING",
          nextAttemptAt:
            attemptCount >= delivery.maxAttempts
              ? null
              : new Date(Date.now() + attemptCount * 5 * 60_000),
          lastErrorCode:"SEND_FAILED",
          lastErrorMessage:
            error instanceof Error
              ? error.message
              : "Unknown send failure",
          claimToken:null,
          claimExpiresAt:null,
        },
      });

      return "FAILED";
    }
  }

  private reminderAt(
    dueDate:Date,
    daysBefore:number,
    time:string,
  ){
    const [hour, minute] =
      time.split(":").map(Number);

    const value =
      new Date(
        dueDate,
      );

    value.setDate(value.getDate() - daysBefore);
    value.setHours(hour ?? 9, minute ?? 0, 0, 0);
    return value;
  }

  private applyQuietHours(
    date:Date,
    start:string,
    end:string,
  ){
    const minutes =
      date.getHours() * 60 + date.getMinutes();
    const startMinutes =
      this.timeToMinutes(start);
    const endMinutes =
      this.timeToMinutes(end);

    const inQuietHours =
      startMinutes > endMinutes
        ? minutes >= startMinutes || minutes < endMinutes
        : minutes >= startMinutes && minutes < endMinutes;

    if(!inQuietHours){
      return date;
    }

    const adjusted =
      new Date(date);
    adjusted.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

    if(startMinutes > endMinutes && minutes >= startMinutes){
      adjusted.setDate(adjusted.getDate() + 1);
    }

    return adjusted;
  }

  private timeToMinutes(
    value:string,
  ){
    const [hour, minute] =
      value.split(":").map(Number);
    return (hour ?? 0) * 60 + (minute ?? 0);
  }

  private buildReminderMessage(
    delivery:any,
  ){
    const commitment =
      delivery.monthlyCommitment.commitment;
    const dueDate =
      new Date(
        delivery.monthlyCommitment.dueDate,
      );
    const remainingDays =
      Math.max(
        0,
        Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000),
      );

    return [
      "🔔 Peringatan Bayaran",
      "",
      `${commitment.name} sebanyak RM${Number(commitment.amount).toLocaleString("ms-MY")} perlu dibayar pada ${dueDate.toLocaleDateString("ms-MY")}.`,
      "",
      remainingDays === 0
        ? "Tarikh bayaran ialah hari ini."
        : `Tinggal ${remainingDays} hari lagi.`,
    ].join("\n");
  }

  private async sendEvolutionText(
    instanceName:string,
    phoneNumber:string,
    message:string,
  ){
    if(!env.EVOLUTION_API_KEY){
      throw new Error("EVOLUTION_API_KEY_MISSING");
    }

    const response =
      await fetch(
        `${env.EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instanceName)}`,
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            apikey:env.EVOLUTION_API_KEY,
          },
          body:JSON.stringify({
            number:phoneNumber,
            text:message,
          }),
        },
      );

    if(!response.ok){
      throw new Error(`EVOLUTION_SEND_TEXT_FAILED_${response.status}`);
    }

    const body =
      await response.json().catch(() => null) as any;

    return String(
      body?.key?.id
      ?? body?.messageId
      ?? "",
    );
  }

}
