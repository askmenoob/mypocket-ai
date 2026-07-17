import { buildApp } from "../app.js";
import { env } from "../config/index.js";

export async function startServer() {

  const app = buildApp();

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

}
