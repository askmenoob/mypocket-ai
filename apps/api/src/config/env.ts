import { config } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  hitPayEnvironmentIssues,
} from "./hitpay-environment.js";
import {
  chipEnvironmentIssues,
} from "./chip-environment.js";

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

  APP_URL:
    z.string()
      .url()
      .optional(),

  LOG_LEVEL: z.string().default("info"),

  DEFAULT_TIMEZONE: z.string().default("Asia/Kuala_Lumpur"),

  JWT_SECRET: z.string().min(32),

  DATABASE_URL: z.string(),

  REDIS_URL: z.string(),

  EVOLUTION_API_URL: z.string(),

  EVOLUTION_API_KEY: z.string().optional(),

  WHATSAPP_WEBHOOK_SECRET: z.string().min(32).optional(),

  GROQ_API_KEY: z.string().optional(),

  GROQ_STT_MODEL:
    z.string()
      .default("whisper-large-v3-turbo"),

  GROQ_VISION_MODEL:
    z.string()
      .default("qwen/qwen3.6-27b"),

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

  BILLING_CHECKOUT_PROVIDER:
    z.enum([
      "disabled",
      "hitpay",
      "chip",
    ])
      .default("hitpay"),

  CHIP_ENVIRONMENT:
    z.enum([
      "test",
      "live",
    ])
      .default("test"),

  CHIP_API_BASE_URL:
    z.string()
      .url()
      .default("https://gate.chip-in.asia/api/v1"),

  CHIP_API_KEY:
    z.string()
      .min(20)
      .optional(),

  CHIP_BRAND_ID:
    z.string()
      .uuid()
      .optional(),

  CHIP_WEBHOOK_PUBLIC_KEY:
    z.string()
      .min(64)
      .optional(),

  CHIP_WEBHOOK_URL:
    z.string()
      .url()
      .optional(),

  CHIP_RETURN_URL:
    z.string()
      .url()
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

}).superRefine(
  (
    value,
    context,
  ) => {
    const issues =
      hitPayEnvironmentIssues({
        environment:
          value.HITPAY_ENVIRONMENT,
        apiBaseUrl:
          value.HITPAY_API_BASE_URL,
        webhookUrl:
          value.HITPAY_WEBHOOK_URL,
        personalProPlanId:
          value.HITPAY_PLAN_PERSONAL_PRO_ID,
        familyPlanId:
          value.HITPAY_PLAN_FAMILY_ID,
        businessPlanId:
          value.HITPAY_PLAN_BUSINESS_ID,
      });

    for(const issue of issues){
      context.addIssue({
        code:
          "custom",
        message:
          issue,
        path:
          issue.startsWith(
            "HITPAY_API_BASE_URL",
          )
            ? ["HITPAY_API_BASE_URL"]
            : issue.startsWith(
              "HITPAY_WEBHOOK_URL",
            )
              ? ["HITPAY_WEBHOOK_URL"]
              : ["HITPAY_PLAN_PERSONAL_PRO_ID"],
      });
    }

    const chipIssues =
      chipEnvironmentIssues({
        environment:
          value.CHIP_ENVIRONMENT,
        apiBaseUrl:
          value.CHIP_API_BASE_URL,
        webhookUrl:
          value.CHIP_WEBHOOK_URL,
      });

    for(const issue of chipIssues){
      context.addIssue({
        code:
          "custom",
        message:
          issue,
        path:
          issue.startsWith("CHIP_WEBHOOK_URL")
            ? ["CHIP_WEBHOOK_URL"]
            : ["CHIP_API_BASE_URL"],
      });
    }

    if(value.BILLING_CHECKOUT_PROVIDER === "chip"){
      const requiredChipValues = [
        ["CHIP_API_KEY", value.CHIP_API_KEY],
        ["CHIP_BRAND_ID", value.CHIP_BRAND_ID],
        ["CHIP_WEBHOOK_PUBLIC_KEY", value.CHIP_WEBHOOK_PUBLIC_KEY],
        ["CHIP_WEBHOOK_URL", value.CHIP_WEBHOOK_URL],
        ["CHIP_RETURN_URL", value.CHIP_RETURN_URL],
      ] as const;

      for(const [name, configured] of requiredChipValues){
        if(!configured){
          context.addIssue({
            code:
              "custom",
            message:
              `${name}_REQUIRED_FOR_CHIP`,
            path:
              [name],
          });
        }
      }
    }
  },
);

export const env = EnvSchema.parse(process.env);
