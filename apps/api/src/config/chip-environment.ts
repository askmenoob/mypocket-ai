export type ChipEnvironment = "test" | "live";

const CHIP_API_ORIGIN = "https://gate.chip-in.asia";

export const activeChipWebhookPath = (environment: ChipEnvironment) =>
  `/billing/chip/webhook/${environment}`;

export const chipEnvironmentIssues = (input: {
  environment: ChipEnvironment;
  apiBaseUrl: string;
  webhookUrl?: string;
}) => {
  const issues: string[] = [];

  try {
    const api = new URL(input.apiBaseUrl);
    if (api.origin !== CHIP_API_ORIGIN) {
      issues.push("CHIP_API_BASE_URL_ORIGIN_INVALID");
    }
    if (api.protocol !== "https:") {
      issues.push("CHIP_API_BASE_URL_PROTOCOL_INVALID");
    }
    if (api.pathname.replace(/\/+$/u, "") !== "/api/v1") {
      issues.push("CHIP_API_BASE_URL_PATH_INVALID");
    }
  } catch {
    issues.push("CHIP_API_BASE_URL_INVALID");
  }

  if (input.webhookUrl) {
    try {
      const webhook = new URL(input.webhookUrl);
      if (webhook.protocol !== "https:") {
        issues.push("CHIP_WEBHOOK_URL_PROTOCOL_INVALID");
      }
      if (!webhook.pathname.endsWith(activeChipWebhookPath(input.environment))) {
        issues.push("CHIP_WEBHOOK_URL_ENVIRONMENT_MISMATCH");
      }
    } catch {
      issues.push("CHIP_WEBHOOK_URL_INVALID");
    }
  }

  return [...new Set(issues)];
};
