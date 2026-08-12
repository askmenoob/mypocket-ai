import { AppError } from "../../shared/errors/app-error.js";

export type ChipPurchaseStatus =
  | "created"
  | "sent"
  | "viewed"
  | "error"
  | "cancelled"
  | "overdue"
  | "expired"
  | "blocked"
  | "hold"
  | "released"
  | "pending_release"
  | "pending_capture"
  | "preauthorized"
  | "paid"
  | "pending_execute"
  | "pending_charge"
  | "cleared"
  | "settled"
  | "chargeback"
  | "pending_refund"
  | "refunded";

export type ChipPurchase = {
  id: string;
  status: ChipPurchaseStatus;
  is_test: boolean;
  checkout_url: string | null;
  reference: string | null;
  reference_generated?: string | null;
  force_recurring: boolean;
  is_recurring_token: boolean;
  recurring_token: string | null;
  updated_on?: number;
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
};

export type ChipCreatePurchaseInput = {
  client: {
    email: string;
    full_name?: string;
  };
  purchase: {
    currency: "MYR";
    products: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
    metadata: Record<string, string>;
  };
  brand_id: string;
  reference: string;
  send_receipt: boolean;
  force_recurring: boolean;
  skip_capture?: boolean;
  payment_method_whitelist?: string[];
  success_redirect: string;
  failure_redirect: string;
  cancel_redirect: string;
  success_callback: string;
  creator_agent: string;
  platform: "web" | "api";
};

type FetchLike = typeof globalThis.fetch;

export class ChipClient {
  constructor(
    private readonly configuration: {
      apiBaseUrl: string;
      apiKey: string;
      timeoutMs?: number;
    },
    private readonly fetchImpl: FetchLike = globalThis.fetch,
  ) {}

  async createPurchase(input: ChipCreatePurchaseInput) {
    return this.request<ChipPurchase>("/purchases/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async retrievePurchase(id: string) {
    this.assertUuid(id, "CHIP_PURCHASE_ID_INVALID");
    return this.request<ChipPurchase>(`/purchases/${id}/`, {
      method: "GET",
    });
  }

  async chargePurchase(id: string, recurringToken: string) {
    this.assertUuid(id, "CHIP_PURCHASE_ID_INVALID");
    this.assertUuid(recurringToken, "CHIP_RECURRING_TOKEN_INVALID");
    return this.request<ChipPurchase>(`/purchases/${id}/charge/`, {
      method: "POST",
      body: JSON.stringify({ recurring_token: recurringToken }),
    });
  }

  async listPaymentMethods(input: {
    brandId: string;
    amountSen: number;
    recurring?: boolean;
    preauthorization?: boolean;
  }) {
    this.assertUuid(input.brandId, "CHIP_BRAND_ID_INVALID");
    if (!Number.isSafeInteger(input.amountSen) || input.amountSen < 0) {
      throw new AppError(
        "CHIP_AMOUNT_INVALID",
        "CHIP payment method amount is invalid.",
        500,
      );
    }

    const query = new URLSearchParams({
      brand_id: input.brandId,
      currency: "MYR",
      amount: String(input.amountSen),
    });
    if (input.recurring !== undefined) {
      query.set("recurring", String(input.recurring));
    }
    if (input.preauthorization !== undefined) {
      query.set("preauthorization", String(input.preauthorization));
    }

    return this.request<{
      available_payment_methods: string[];
      names?: Record<string, string>;
      card_methods?: string[];
    }>(`/payment_methods/?${query.toString()}`, { method: "GET" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//")) {
      throw new AppError("CHIP_PATH_INVALID", "Invalid CHIP API path.", 500);
    }

    const baseUrl = this.configuration.apiBaseUrl.replace(/\/+$/u, "");
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.configuration.timeoutMs ?? 15_000,
    );

    try {
      const response = await this.fetchImpl(`${baseUrl}${path}`, {
        ...init,
        redirect: "error",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.configuration.apiKey}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
      });

      const text = await response.text();
      let payload: unknown = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          throw new AppError(
            "CHIP_RESPONSE_INVALID",
            "CHIP returned a non-JSON response.",
            502,
          );
        }
      }

      if (!response.ok) {
        throw new AppError(
          "CHIP_REQUEST_FAILED",
          `CHIP request failed with status ${response.status}.`,
          502,
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(
          "CHIP_REQUEST_TIMEOUT",
          "CHIP did not respond before the timeout.",
          504,
        );
      }
      throw new AppError(
        "CHIP_REQUEST_UNAVAILABLE",
        "CHIP is temporarily unavailable.",
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertUuid(value: string, code: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
      throw new AppError(code, "Invalid CHIP identifier.", 500);
    }
  }
}
