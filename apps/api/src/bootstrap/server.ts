import { buildApp } from "../app.js";
import { env } from "../config/index.js";
import { CommitmentScheduler } from "../modules/commitment/commitment.scheduler.js";
import { BillingLifecycleScheduler } from "../modules/billing/billing-lifecycle.scheduler.js";

export async function startServer() {

  const app = buildApp();

  const commitmentScheduler =
    new CommitmentScheduler(
      app,
    );

  const billingScheduler =
    new BillingLifecycleScheduler(
      app,
    );

  app.addHook(
    "onClose",
    async () => {
      commitmentScheduler.stop();
      billingScheduler.stop();
    },
  );

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  commitmentScheduler.start();
  billingScheduler.start();

}
