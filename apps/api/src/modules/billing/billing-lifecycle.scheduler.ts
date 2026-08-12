import type { FastifyInstance } from "fastify";
import { env } from "../../config/index.js";
import {
  buildRenewalSchedule,
  computePlanQuote,
  deriveBillingAccessState,
  automaticRenewalChargeCutoff,
  getGraceDays,
  getReminderOffsetsDays,
  type BillingPlan,
} from "./billing-plan.policy.js";
import { ChipBillingService } from "./chip-billing.service.js";

const POLL_INTERVAL_MS = 5 * 60_000;
const DAY_MS = 86_400_000;

export class BillingLifecycleScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly chip: ChipBillingService;

  constructor(private readonly app: FastifyInstance) {
    this.chip = new ChipBillingService(app);
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick().catch((error) => {
        this.app.log.error({ error }, "BILLING_LIFECYCLE_TICK_FAILED");
      });
    }, POLL_INTERVAL_MS);
    this.timer.unref?.();
    void this.tick().catch((error) => {
      this.app.log.error({ error }, "BILLING_LIFECYCLE_STARTUP_TICK_FAILED");
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(now = new Date()) {
    if (this.running) return { skipped: true, reason: "ALREADY_RUNNING" };
    this.running = true;
    try {
      await this.createUpcomingRenewals(now);
      if (env.BILLING_CHECKOUT_PROVIDER === "chip") {
        await this.startUpcomingPayments(now);
        await this.reconcilePendingPayments(now);
      }
      await this.createReminderDeliveries(now);
      const transitions = await this.reconcileAccessStates(now);
      const deliveries = await this.sendDueReminders(now);
      return { skipped: false, transitions, deliveries };
    } finally {
      this.running = false;
    }
  }

  private async createUpcomingRenewals(now: Date) {
    const horizon = new Date(now.getTime() + 30 * DAY_MS);
    const subscriptions = await this.app.prisma.workspaceBillingSubscription.findMany({
      where: {
        accessState: { in: ["ACTIVE", "PAYMENT_DUE", "GRACE"] },
        cancelAtPeriodEnd: false,
        nextRenewalAt: { not: null, lte: horizon },
      },
    });
    const settings = await this.app.prisma.billingSettings.findUnique({
      where: { id: "global" },
    });
    if (!settings) return;

    for (const subscription of subscriptions) {
      if (!subscription.nextRenewalAt) continue;
      const plan = subscription.pendingPlan ?? subscription.plan;
      if (!this.isPlan(plan)) continue;
      const schedule = buildRenewalSchedule({
        paidAt: subscription.nextRenewalAt,
        paidThroughAt: subscription.nextRenewalAt,
        interval: subscription.billingInterval,
        plan,
      });
      const quote = computePlanQuote({
        plan,
        interval: subscription.billingInterval,
        annualDiscountPercent: String(settings.annualDiscountPercent),
      });
      const reference = [
        "renewal",
        subscription.id,
        subscription.nextRenewalAt.toISOString().slice(0, 10),
      ].join(":");
      await this.app.prisma.billingRenewal.upsert({
        where: { invoiceReference: reference },
        create: {
          workspaceBillingSubscriptionId: subscription.id,
          invoiceReference: reference,
          status: "SCHEDULED",
          plan,
          billingInterval: subscription.billingInterval,
          renewalMethod: subscription.renewalMethod,
          currency: "MYR",
          amountDue: quote.amountDueSen / 100,
          periodStart: schedule.coverageStart,
          periodEnd: schedule.coverageEnd,
          dueAt: subscription.nextRenewalAt,
          graceEndsAt: new Date(
            subscription.nextRenewalAt.getTime() + getGraceDays(plan) * DAY_MS,
          ),
        },
        update: {},
      });
    }
  }

  private async startUpcomingPayments(now: Date) {
    const chargeCutoff = automaticRenewalChargeCutoff(now);
    const renewals = await this.app.prisma.billingRenewal.findMany({
      where: {
        status: "SCHEDULED",
        paymentAttemptId: null,
        dueAt: { lte: chargeCutoff },
      },
      orderBy: { dueAt: "asc" },
      take: 20,
    });
    for (const renewal of renewals) {
      try {
        await this.chip.createRenewalPayment(renewal.id);
      } catch (error) {
        this.app.log.warn(
          { error, renewalId: renewal.id },
          "BILLING_RENEWAL_PAYMENT_START_FAILED",
        );
      }
    }
  }

  private async createReminderDeliveries(now: Date) {
    const horizon = new Date(now.getTime() + 30 * DAY_MS);
    const renewals = await this.app.prisma.billingRenewal.findMany({
      where: {
        status: { in: ["SCHEDULED", "INVOICED", "FAILED"] },
        dueAt: { lte: horizon },
      },
    });
    for (const renewal of renewals) {
      for (const offset of getReminderOffsetsDays(renewal.billingInterval)) {
        const scheduledFor = new Date(renewal.dueAt.getTime() - offset * DAY_MS);
        await this.app.prisma.billingReminderDelivery.upsert({
          where: { dedupeKey: `${renewal.id}:DUE_MINUS_${offset}` },
          create: {
            workspaceBillingSubscriptionId:
              renewal.workspaceBillingSubscriptionId,
            billingRenewalId: renewal.id,
            dedupeKey: `${renewal.id}:DUE_MINUS_${offset}`,
            reminderType: offset === 0 ? "PAYMENT_DUE" : `DUE_IN_${offset}_DAYS`,
            scheduledFor,
          },
          update: {},
        });
      }
    }
  }

  private async reconcilePendingPayments(now: Date) {
    const staleBefore = new Date(now.getTime() - 5 * 60_000);
    const attempts = await this.app.prisma.billingPaymentAttempt.findMany({
      where: {
        provider: "CHIP",
        status: { in: ["CREATED", "PENDING"] },
        providerCheckoutId: { not: null },
        updatedAt: { lte: staleBefore },
      },
      orderBy: { updatedAt: "asc" },
      take: 20,
    });
    for (const attempt of attempts) {
      try {
        await this.chip.reconcilePendingPayment(attempt.id);
      } catch (error) {
        this.app.log.warn(
          { error, attemptId: attempt.id },
          "BILLING_PAYMENT_RECONCILIATION_FAILED",
        );
      }
    }
  }

  private async reconcileAccessStates(now: Date) {
    const subscriptions = await this.app.prisma.workspaceBillingSubscription.findMany({
      where: {
        accessState: { in: ["ACTIVE", "PAYMENT_DUE", "GRACE"] },
        paymentDueAt: { not: null, lte: now },
        graceEndsAt: { not: null },
      },
    });
    let changed = 0;
    for (const subscription of subscriptions) {
      if (!subscription.paymentDueAt || !subscription.graceEndsAt) continue;
      const state = deriveBillingAccessState({
        now,
        paymentDueAt: subscription.paymentDueAt,
        graceEndsAt: subscription.graceEndsAt,
      });
      if (state === subscription.accessState) continue;
      await this.app.prisma.$transaction(async (tx) => {
        await tx.workspaceBillingSubscription.update({
          where: { id: subscription.id },
          data: {
            accessState: state,
            status: state === "SUSPENDED" ? "SUSPENDED" : subscription.status,
            suspendedAt: state === "SUSPENDED" ? now : null,
          },
        });
        if (state === "SUSPENDED") {
          await tx.subscription.updateMany({
            where: { userId: subscription.ownerUserId },
            data: { status: "INACTIVE" },
          });
        }
        await tx.billingReminderDelivery.upsert({
          where: {
            dedupeKey: `${subscription.id}:ACCESS_${state}:${subscription.paymentDueAt?.toISOString()}`,
          },
          create: {
            workspaceBillingSubscriptionId: subscription.id,
            dedupeKey: `${subscription.id}:ACCESS_${state}:${subscription.paymentDueAt?.toISOString()}`,
            reminderType: `ACCESS_${state}`,
            scheduledFor: now,
          },
          update: {},
        });
      });
      changed += 1;
    }
    return changed;
  }

  private async sendDueReminders(now: Date) {
    const deliveries = await this.app.prisma.billingReminderDelivery.findMany({
      where: { status: "PENDING", scheduledFor: { lte: now } },
      include: {
        billingRenewal: { include: { paymentAttempt: true } },
        workspaceBillingSubscription: {
          include: {
            workspace: { include: { whatsapp: true, members: true } },
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 20,
    });
    let sent = 0;
    for (const delivery of deliveries) {
      const subscription = delivery.workspaceBillingSubscription;
      const instance =
        subscription.workspace.whatsapp.find(
          (item) => item.status.toUpperCase() === "CONNECTED",
        ) ?? subscription.workspace.whatsapp[0];
      const owner = subscription.workspace.members.find(
        (member) => member.userId === subscription.ownerUserId && member.whatsappPhoneNumber,
      );
      if (!instance || !owner?.whatsappPhoneNumber) {
        await this.app.prisma.billingReminderDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "FAILED",
            errorMessage: "CONNECTED_WHATSAPP_OR_OWNER_PHONE_NOT_FOUND",
          },
        });
        continue;
      }
      try {
        await this.sendText(
          instance.instanceName,
          owner.whatsappPhoneNumber,
          this.reminderMessage(delivery),
        );
        await this.app.prisma.billingReminderDelivery.update({
          where: { id: delivery.id },
          data: { status: "SENT", sentAt: new Date(), errorMessage: null },
        });
        sent += 1;
      } catch (error) {
        await this.app.prisma.billingReminderDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "FAILED",
            errorMessage:
              error instanceof Error ? error.message.slice(0, 500) : "SEND_FAILED",
          },
        });
      }
    }
    return { checked: deliveries.length, sent };
  }

  private reminderMessage(delivery: {
    reminderType: string;
    billingRenewal: null | {
      amountDue: unknown;
      dueAt: Date;
      paymentAttempt: null | { checkoutUrl: string | null };
    };
  }) {
    const renewal = delivery.billingRenewal;
    if (delivery.reminderType === "ACCESS_SUSPENDED") {
      return [
        "⚠️ Langganan MyPocket telah digantung kerana bayaran belum diterima.",
        "Bot tidak akan merekod transaksi, resit atau voice sehingga bayaran disahkan.",
        "Taip !pay untuk pautan pembayaran atau buka Billing di app.imai.my.",
      ].join("\n");
    }
    if (delivery.reminderType === "ACCESS_REACTIVATED") {
      return [
        "✅ Bayaran MyPocket telah disahkan.",
        "Akses WhatsApp anda aktif semula dan boleh merekod transaksi, resit serta voice.",
        "Taip !status untuk semak langganan.",
      ].join("\n");
    }
    if (delivery.reminderType === "ACCESS_GRACE") {
      return [
        "⚠️ Langganan MyPocket berada dalam tempoh bertenang.",
        "Sila buat bayaran sebelum akses bot digantung.",
        "Taip !pay untuk pautan pembayaran.",
      ].join("\n");
    }
    if (!renewal) {
      return "ℹ️ Status langganan MyPocket anda telah berubah. Taip !status untuk semak.";
    }
    return [
      `🔔 Peringatan langganan MyPocket: MYR ${Number(renewal.amountDue).toFixed(2)}`,
      `Tarikh akhir: ${renewal.dueAt.toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}`,
      renewal.paymentAttempt?.checkoutUrl
        ? `Bayar: ${renewal.paymentAttempt.checkoutUrl}`
        : "Taip !pay untuk jana pautan pembayaran.",
    ].join("\n");
  }

  private async sendText(instanceName: string, number: string, text: string) {
    if (!env.EVOLUTION_API_KEY) throw new Error("EVOLUTION_API_KEY_MISSING");
    const response = await fetch(
      `${env.EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instanceName)}`,
      {
        method: "POST",
        headers: {
          apikey: env.EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number, text }),
      },
    );
    if (!response.ok) throw new Error(`EVOLUTION_SEND_FAILED_${response.status}`);
  }

  private isPlan(value: string): value is BillingPlan {
    return value === "PERSONAL_PRO" || value === "FAMILY" || value === "BUSINESS";
  }
}
