import { buildApp } from "../app.js";
import { env } from "../config/index.js";
import { CommitmentScheduler } from "../modules/commitment/commitment.scheduler.js";

export async function startServer() {

  const app = buildApp();

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  const commitmentScheduler =
    new CommitmentScheduler(
      app,
    );

  commitmentScheduler.start();

  app.addHook(
    "onClose",
    async () => {
      commitmentScheduler.stop();
    },
  );

}
