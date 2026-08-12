export type WhatsAppBillingAccessState =
  | "PENDING"
  | "ACTIVE"
  | "PAYMENT_DUE"
  | "GRACE"
  | "SUSPENDED"
  | "CANCELED"
  | null;

const allowedWhileSuspended = (text: string) => {
  const command = text
    .trim()
    .replace(/^!+\s*/u, "")
    .toLowerCase();
  return /^(?:pay|payment|bayar\s+(?:langganan|subscription)|status|help|bantuan|cancel|batal)(?:\s|$)/u.test(
    command,
  );
};

export const evaluateWhatsAppBillingAccess = (input: {
  accessState: WhatsAppBillingAccessState;
  text?: string;
  isMedia: boolean;
}) => {
  if (input.accessState === "SUSPENDED") {
    const allowed = !input.isMedia && allowedWhileSuspended(input.text ?? "");
    return { allowed, warning: "SUSPENDED" as const };
  }
  if (input.accessState === "GRACE" || input.accessState === "PAYMENT_DUE") {
    return { allowed: true, warning: input.accessState };
  }
  return { allowed: true, warning: null };
};

export const isBillingPaymentCommand = (text: string) =>
  /^(?:pay|payment|bayar\s+(?:langganan|subscription))(?:\s|$)/iu.test(
    text.trim().replace(/^!+\s*/u, ""),
  );
