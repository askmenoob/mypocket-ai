import type { FastifyPluginAsync } from "fastify";

import { requireSuperAdmin } from "../../shared/auth/index.js";
import { PromotionController } from "./promotion.controller.js";

const promotionRoutes:FastifyPluginAsync = async (app) => {
  const controller = new PromotionController(app);
  const adminGuard = [app.authenticate, requireSuperAdmin];

  app.get(
    "/admin/campaigns",
    { preHandler:adminGuard },
    controller.listCampaigns,
  );
  app.post(
    "/admin/campaigns",
    { preHandler:adminGuard },
    controller.createCampaign,
  );
  app.patch<{ Params:{ campaignId:string } }>(
    "/admin/campaigns/:campaignId",
    { preHandler:adminGuard },
    controller.updateCampaign,
  );
  app.post<{ Params:{ campaignId:string } }>(
    "/admin/campaigns/:campaignId/transition",
    { preHandler:adminGuard },
    controller.transitionCampaign,
  );
  app.get(
    "/admin/usage",
    { preHandler:adminGuard },
    controller.listUsage,
  );
  app.get(
    "/admin/audit",
    { preHandler:adminGuard },
    controller.listAudit,
  );

  app.post(
    "/quote",
    { preHandler:[app.authenticate] },
    controller.quote,
  );
  app.post(
    "/redeem",
    { preHandler:[app.authenticate] },
    controller.redeem,
  );
  app.post<{ Params:{ redemptionId:string } }>(
    "/redemptions/:redemptionId/cancel",
    { preHandler:[app.authenticate] },
    controller.cancelRedemption,
  );
};

export default promotionRoutes;
