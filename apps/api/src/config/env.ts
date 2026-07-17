import { config } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({
  path: path.resolve(__dirname, "../../../../.env"),
});

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  HOST: z.string().default("0.0.0.0"),

  PORT: z.coerce.number().default(3000),

  APP_URL: z.string().optional(),

  LOG_LEVEL: z.string().default("info"),

  JWT_SECRET: z.string().min(32),

  DATABASE_URL: z.string(),

  REDIS_URL: z.string(),

  EVOLUTION_API_URL: z.string(),

  EVOLUTION_API_KEY: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),

  GOOGLE_CLIENT_SECRET: z.string().optional(),

  GOOGLE_REDIRECT_URI: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
