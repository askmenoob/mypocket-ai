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

  DEFAULT_TIMEZONE: z.string().default("Asia/Kuala_Lumpur"),

  JWT_SECRET: z.string().min(32),

  DATABASE_URL: z.string(),

  REDIS_URL: z.string(),

  EVOLUTION_API_URL: z.string(),

  EVOLUTION_API_KEY: z.string().optional(),

  WHATSAPP_WEBHOOK_SECRET: z.string().min(32).optional(),

  GROQ_API_KEY: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),

  GOOGLE_CLIENT_SECRET: z.string().optional(),

  GOOGLE_REDIRECT_URI: z.string().optional(),

  GOOGLE_AUTH_REDIRECT_URI: z.string().optional(),

  GOOGLE_APPS_SCRIPT_URL:
    z.string()
     .url()
     .optional(),


  MYPOCKET_APPS_SCRIPT_API_KEY:
    z.string()
     .min(64)
     .optional(),

  GOOGLE_TOKEN_ENCRYPTION_KEY:
    z.string()
      .min(64),


  GOOGLE_REPORTS_FOLDER_ID:
    z.string()
      .min(1),


  GOOGLE_TEMPLATE_ROOT_FOLDER_ID:
    z.string()
      .optional(),

  HITPAY_ENVIRONMENT:
    z.enum([
      "sandbox",
      "production",
    ]),

  HITPAY_API_BASE_URL:
    z.string()
      .url(),

  HITPAY_API_KEY:
    z.string()
      .min(40),

  HITPAY_SALT:
    z.string()
      .min(32),

  HITPAY_WEBHOOK_SALT:
    z.string()
      .min(32)
      .optional(),

  HITPAY_WEBHOOK_URL:
    z.string()
      .url(),

  HITPAY_RETURN_URL:
    z.string()
      .url(),

  HITPAY_PLAN_PERSONAL_PRO_ID:
    z.string()
      .uuid(),

  HITPAY_PLAN_FAMILY_ID:
    z.string()
      .uuid(),

  HITPAY_PLAN_BUSINESS_ID:
    z.string()
      .uuid(),

});

export const env = EnvSchema.parse(process.env);
