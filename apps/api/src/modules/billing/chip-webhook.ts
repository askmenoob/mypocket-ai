import { createHash, createVerify } from "node:crypto";
import { AppError } from "../../shared/errors/app-error.js";

export type ChipWebhookPayload = {
  event_type: string;
  id: string;
  status: string;
  is_test: boolean;
  updated_on?: number;
  reference?: string | null;
  is_recurring_token?: boolean;
  recurring_token?: string | null;
  payment?: {
    amount?: number;
    currency?: string;
    paid_on?: number;
  } | null;
  purchase?: {
    total?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  };
  transaction_data?: {
    payment_method?: string;
  };
  related_to?: {
    type: string;
    id: string;
  } | null;
};

const PAYMENT_EVENT_STATUSES: Record<string, string> = {
  "payment.refunded": "refunded",
  "payment.charged_back": "chargeback",
  "payment.chargeback_reversed": "chargeback_reversed",
};

export const verifyChipWebhookSignature = (input: {
  rawBody: Buffer;
  signature: string;
  publicKeyPem: string;
}) => {
  if (!input.signature.trim() || !input.publicKeyPem.trim()) {
    return false;
  }
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(input.rawBody);
    verifier.end();
    return verifier.verify(input.publicKeyPem, input.signature, "base64");
  } catch {
    return false;
  }
};

export const parseChipWebhookPayload = (rawBody: Buffer) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new AppError(
      "CHIP_WEBHOOK_BODY_INVALID",
      "CHIP webhook body is invalid.",
      400,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AppError(
      "CHIP_WEBHOOK_BODY_INVALID",
      "CHIP webhook body is invalid.",
      400,
    );
  }

  const payload = parsed as Record<string, unknown>;
  if (
    typeof payload.event_type !== "string" ||
    typeof payload.id !== "string" ||
    typeof payload.is_test !== "boolean"
  ) {
    throw new AppError(
      "CHIP_WEBHOOK_FIELDS_INVALID",
      "CHIP webhook fields are incomplete.",
      400,
    );
  }

  const derivedStatus = PAYMENT_EVENT_STATUSES[payload.event_type];
  const status =
    typeof payload.status === "string"
      ? payload.status
      : derivedStatus;
  const relatedTo = payload.related_to;

  if (
    !status ||
    (derivedStatus &&
      (!relatedTo ||
        typeof relatedTo !== "object" ||
        Array.isArray(relatedTo) ||
        (relatedTo as Record<string, unknown>).type !== "purchase" ||
        typeof (relatedTo as Record<string, unknown>).id !== "string"))
  ) {
    throw new AppError(
      "CHIP_WEBHOOK_FIELDS_INVALID",
      "CHIP webhook fields are incomplete.",
      400,
    );
  }

  return {
    ...payload,
    status,
  } as ChipWebhookPayload;
};

export const chipWebhookPurchaseId = (payload: ChipWebhookPayload) =>
  payload.event_type.startsWith("payment.")
    ? payload.related_to?.id ?? payload.id
    : payload.id;

export const chipWebhookObjectType = (payload: ChipWebhookPayload) =>
  payload.event_type.split(".", 1)[0] ?? "unknown";

export const chipWebhookEventKey = (
  payload: ChipWebhookPayload,
  rawBody: Buffer,
) => [
  "CHIP",
  payload.event_type,
  payload.id,
  payload.updated_on ?? createHash("sha256").update(rawBody).digest("hex"),
  payload.status,
].join(":");
