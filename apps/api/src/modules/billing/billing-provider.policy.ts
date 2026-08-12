import {
  AppError,
} from "../../shared/errors/app-error.js";


export type BillingProviderMode =
  | "disabled"
  | "chip";


export type ActiveBillingProvider =
  "chip";


export function assertBillingProviderCallAllowed(
  mode:BillingProviderMode,
  requestedProvider:ActiveBillingProvider,
){
  if(mode === "disabled"){
    throw new AppError(
      "BILLING_CHECKOUT_DISABLED",
      "New payments are temporarily paused while CHIP setup is completed",
      503,
    );
  }

  if(mode !== requestedProvider){
    throw new AppError(
      "BILLING_PROVIDER_INACTIVE",
      "This payment provider is not active",
      503,
    );
  }
}
