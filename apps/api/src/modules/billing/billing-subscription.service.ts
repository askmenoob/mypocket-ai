import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";

export class BillingSubscriptionService {
  constructor(private readonly app: FastifyInstance) {}

  async getSubscription(input:{ userId:string; workspaceId:string }) {
    const membership = await this.app.prisma.workspaceMember.findUnique({
      where:{
        userId_workspaceId:{
          userId:input.userId,
          workspaceId:input.workspaceId,
        },
      },
      include:{
        user:{ include:{ subscription:true } },
        workspace:{ include:{ billingSubscription:true } },
      },
    });

    if(!membership){
      throw new AppError(
        "BILLING_MEMBERSHIP_NOT_FOUND",
        "Workspace membership not found",
        404,
      );
    }

    const billing = membership.workspace.billingSubscription;
    const renewalHistory = billing
      ? await this.app.prisma.billingRenewal.findMany({
          where:{ workspaceBillingSubscriptionId:billing.id },
          orderBy:{ createdAt:"desc" },
          take:10,
          select:{
            id:true,
            invoiceReference:true,
            status:true,
            plan:true,
            billingInterval:true,
            renewalMethod:true,
            currency:true,
            amountDue:true,
            periodStart:true,
            periodEnd:true,
            dueAt:true,
            graceEndsAt:true,
            paidAt:true,
            createdAt:true,
          },
        })
      : [];

    return {
      workspace:{
        id:membership.workspace.id,
        name:membership.workspace.name,
        type:membership.workspace.type,
        role:membership.role,
      },
      access:{
        plan:membership.user.subscription?.plan ?? "FREE",
        status:membership.user.subscription?.status ?? "ACTIVE",
        expiresAt:membership.user.subscription?.expiresAt ?? null,
      },
      billing:billing
        ? {
            plan:billing.plan,
            pendingPlan:billing.pendingPlan,
            planChangeRequestedAt:billing.planChangeRequestedAt,
            status:billing.status,
            provider:billing.provider,
            checkoutUrl:billing.checkoutUrl,
            currentPeriodStart:billing.currentPeriodStart,
            currentPeriodEnd:billing.currentPeriodEnd,
            lastPaymentAt:billing.lastPaymentAt,
            lastPaymentStatus:billing.lastPaymentStatus,
            canceledAt:billing.canceledAt,
            billingInterval:billing.billingInterval,
            renewalMethod:billing.renewalMethod,
            accessState:billing.accessState,
            paidThroughAt:billing.paidThroughAt,
            nextRenewalAt:billing.nextRenewalAt,
            paymentDueAt:billing.paymentDueAt,
            graceEndsAt:billing.graceEndsAt,
            autoRenewEnabled:billing.autoRenewEnabled,
            cancelAtPeriodEnd:billing.cancelAtPeriodEnd,
          }
        : null,
      renewalHistory,
    };
  }
}
