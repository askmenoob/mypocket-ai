import type { FastifyReply, FastifyRequest } from "fastify";
import type { BillingSubscriptionService } from "./billing-subscription.service.js";

type SessionUser = { userId:string; workspaceId:string };

export class BillingSubscriptionController {
  constructor(private readonly service:BillingSubscriptionService) {}

  getSubscription = async (
    request:FastifyRequest,
    reply:FastifyReply,
  ) => {
    const actor = request.user as unknown as SessionUser;
    return reply.send(
      await this.service.getSubscription({
        userId:actor.userId,
        workspaceId:actor.workspaceId,
      }),
    );
  };
}
