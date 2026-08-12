import { useEffect, useMemo, useState } from "react";

export type ChipBillingPlan = "PERSONAL_PRO" | "FAMILY" | "BUSINESS";
export type ChipBillingInterval = "MONTHLY" | "SIX_MONTHS" | "YEARLY";
export type ChipRenewalMethod = "AUTOMATIC" | "MANUAL";

const entitlementBearingStates = new Set([
  "ACTIVE",
  "PAYMENT_DUE",
  "GRACE",
  "SUSPENDED",
]);

export function resolveChipAccessPlan(input:{
  billingPlan:ChipBillingPlan | null;
  accessState:string | null | undefined;
  legacyPlan:string;
}){
  if(
    input.billingPlan
    && input.accessState
    && entitlementBearingStates.has(input.accessState)
  ){
    return input.billingPlan;
  }
  return input.legacyPlan;
}

export function isChipPlanDowngrade(
  currentAccessPlan:string,
  selectedPlan:ChipBillingPlan,
){
  const currentIndex = plans.findIndex(
    (item) => item.plan === currentAccessPlan,
  );
  const selectedIndex = plans.findIndex(
    (item) => item.plan === selectedPlan,
  );
  return currentIndex >= 0 && selectedIndex < currentIndex;
}

type Quote = {
  plan:ChipBillingPlan;
  interval:ChipBillingInterval;
  currency:"MYR";
  baseAmountSen:number;
  annualDiscountBasisPoints:number;
  discountAmountSen:number;
  amountDueSen:number;
  promotion?:{
    campaign:{ code:string; name:string; type:string };
    disclosure:{
      firstChargeAmount:number;
      trialEndsAt:string | null;
      nextChargeAt:string | null;
      nextChargeAmount:number | null;
      summary:string;
    };
  };
};

type MethodsResponse = {
  available:string[];
  names:Record<string, string>;
  quote:Quote;
};

const plans:Array<{
  plan:ChipBillingPlan;
  name:string;
  monthly:number;
  description:string;
}> = [
  { plan:"PERSONAL_PRO", name:"Personal Pro", monthly:9, description:"Personal finance, AI, Google Sheets and Google Drive for one active individual." },
  { plan:"FAMILY", name:"Family", monthly:19, description:"Shared family records, multiple members and a WhatsApp phone whitelist." },
  { plan:"BUSINESS", name:"Business / Company", monthly:49, description:"Company records, employee roles and complete business reporting." },
];

const intervalMonths:Record<ChipBillingInterval, number> = {
  MONTHLY:1,
  SIX_MONTHS:6,
  YEARLY:12,
};

const intervalLabel:Record<ChipBillingInterval, string> = {
  MONTHLY:"1 month",
  SIX_MONTHS:"6 months",
  YEARLY:"1 year",
};

const displayDate = (value:string | null | undefined) => value
  ? new Date(value).toLocaleDateString("en-MY", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

const friendlyMethod = (code:string, names:Record<string, string>) => {
  if(names[code]){ return names[code]; }
  const known:Record<string, string> = {
    fpx:"FPX online banking",
    duitnow_qr:"DuitNow QR",
    dnqr:"DuitNow QR",
    razer_tng:"Touch 'n Go eWallet",
    card:"Credit / debit card",
    visa:"Visa",
    mastercard:"Mastercard",
  };
  return known[code] ?? code.replaceAll("_", " ");
};

async function request<T>(apiBase:string, token:string, path:string):Promise<T>{
  const response = await fetch(`${apiBase}${path}`, {
    headers:{ Authorization:`Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if(!response.ok){
    throw new Error(payload?.error?.message ?? payload?.message ?? `HTTP ${response.status}`);
  }
  return payload as T;
}

export function ChipBillingPlanModal(props:{
  apiBase:string;
  token:string;
  workspaceType:string;
  currentAccessPlan:string;
  currentBillingPlan:ChipBillingPlan | null;
  pendingPlan:ChipBillingPlan | null;
  billingStatus:string;
  accessState?:string | null;
  currentInterval?:ChipBillingInterval | null;
  paidThroughAt?:string | null;
  paymentDueAt?:string | null;
  graceEndsAt?:string | null;
  cancelAtPeriodEnd?:boolean;
  renewalHistory?:Array<{
    id:string;
    invoiceReference:string;
    status:string;
    plan:string;
    billingInterval:ChipBillingInterval;
    renewalMethod:ChipRenewalMethod;
    currency:string;
    amountDue:string | number;
    dueAt:string;
    paidAt:string | null;
  }>;
  canManage:boolean;
  busyPlan:ChipBillingPlan | null;
  error:string;
  close:() => void;
  cancelRenewal:() => void;
  selectPlan:(input:{
    plan:ChipBillingPlan;
    interval:ChipBillingInterval;
    renewalMethod:ChipRenewalMethod;
    preferredPaymentMethod?:string;
    promoCode?:string;
  }) => void;
}){
  const initialPlan = plans.some((item) => item.plan === props.currentAccessPlan)
    ? props.currentAccessPlan as ChipBillingPlan
    : "PERSONAL_PRO";
  const [selectedPlan, setSelectedPlan] = useState<ChipBillingPlan>(initialPlan);
  const [interval, setInterval] = useState<ChipBillingInterval>(props.currentInterval ?? "MONTHLY");
  const [renewalMethod, setRenewalMethod] = useState<ChipRenewalMethod>("AUTOMATIC");
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [methods, setMethods] = useState<string[]>([]);
  const [methodNames, setMethodNames] = useState<Record<string, string>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsMessage, setOptionsMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState("");

  const query = useMemo(() => new URLSearchParams({
    plan:selectedPlan,
    interval,
    renewalMethod,
    ...(appliedPromoCode ? { promoCode:appliedPromoCode } : {}),
  }).toString(), [selectedPlan, interval, renewalMethod, appliedPromoCode]);

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    setOptionsMessage("");
    setPreferredPaymentMethod("");
    Promise.allSettled([
      request<Quote>(props.apiBase, props.token, `/billing/quote?${query}`),
      request<MethodsResponse>(props.apiBase, props.token, `/billing/chip/payment-methods?${query}`),
    ]).then(([quoteResult, methodsResult]) => {
      if(cancelled){ return; }
      if(quoteResult.status === "fulfilled"){
        setQuote(quoteResult.value);
      }else{
        setQuote(null);
        setOptionsMessage(quoteResult.reason instanceof Error ? quoteResult.reason.message : "Price could not be loaded.");
      }
      if(methodsResult.status === "fulfilled"){
        setMethods(methodsResult.value.available);
        setMethodNames(methodsResult.value.names ?? {});
        setQuote(methodsResult.value.quote);
      }else{
        setMethods([]);
        if(quoteResult.status === "fulfilled"){
          setOptionsMessage("CHIP test checkout is being configured. Prices are available, but payment is not active yet.");
        }
      }
    }).finally(() => {
      if(!cancelled){ setLoadingOptions(false); }
    });
    return () => { cancelled = true; };
  }, [props.apiBase, props.token, query]);

  const selected = plans.find((item) => item.plan === selectedPlan) ?? plans[0];
  const fallbackAmount = selected.monthly * intervalMonths[interval];
  const amount = quote ? quote.amountDueSen / 100 : fallbackAmount;
  const annualDiscount = quote ? quote.annualDiscountBasisPoints / 100 : 0;
  const isDowngrade = isChipPlanDowngrade(
    props.currentAccessPlan,
    selectedPlan,
  );
  const selectedMethodAvailable = !preferredPaymentMethod || methods.includes(preferredPaymentMethod);
  const canContinue = props.canManage && !props.busyPlan && selectedMethodAvailable;

  return (
    <div className="billingModalBackdrop" role="presentation" onMouseDown={(event) => {
      if(event.target === event.currentTarget){ props.close(); }
    }}>
      <section className="billingModal chipBillingModal" role="dialog" aria-modal="true" aria-labelledby="chip-billing-title">
        <header className="billingModalHeader">
          <div>
            <span>MyPocket AI subscription · secured by CHIP</span>
            <h2 id="chip-billing-title">Choose a plan and payment schedule</h2>
            <p>Current access: <strong>{plans.find((item) => item.plan === props.currentAccessPlan)?.name ?? props.currentAccessPlan}</strong>{props.accessState ? ` · ${props.accessState.replaceAll("_", " ")}` : ""}</p>
          </div>
          <button type="button" className="billingModalClose" aria-label="Close subscription manager" onClick={props.close}>×</button>
        </header>

        {props.pendingPlan && <div className="billingPendingNotice"><strong>Plan change pending</strong><span>{plans.find((item) => item.plan === props.pendingPlan)?.name ?? props.pendingPlan} is waiting for payment confirmation or its scheduled effective date.</span></div>}
        {!props.canManage && <div className="billingOwnerNotice">Only the workspace Owner can purchase or change a subscription.</div>}
        {props.error && <div className="billingModalError" role="alert">{props.error}</div>}

        {props.currentBillingPlan && <div className="chipBillingStatusGrid">
          <div><span>Access</span><strong>{props.accessState?.replaceAll("_", " ") ?? props.billingStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Paid through</span><strong>{displayDate(props.paidThroughAt)}</strong></div>
          <div><span>Payment due</span><strong>{displayDate(props.paymentDueAt)}</strong></div>
          <div><span>Grace ends</span><strong>{displayDate(props.graceEndsAt)}</strong></div>
          {props.canManage && <button type="button" className="chipCancelRenewal" disabled={Boolean(props.busyPlan) || props.cancelAtPeriodEnd} onClick={props.cancelRenewal}>{props.cancelAtPeriodEnd ? "Renewal already canceled" : "Cancel automatic renewal"}</button>}
        </div>}

        <div className="chipBillingControls">
          <label><span>Subscription period</span><select value={interval} onChange={(event) => setInterval(event.target.value as ChipBillingInterval)}><option value="MONTHLY">1 month</option><option value="SIX_MONTHS">6 months</option><option value="YEARLY">1 year</option></select></label>
          <label><span>Renewal</span><select value={renewalMethod} onChange={(event) => setRenewalMethod(event.target.value as ChipRenewalMethod)}><option value="AUTOMATIC">Automatic renewal</option><option value="MANUAL">Manual payment</option></select></label>
          <label><span>Payment method</span><select value={preferredPaymentMethod} onChange={(event) => setPreferredPaymentMethod(event.target.value)} disabled={loadingOptions || methods.length === 0}><option value="">Let CHIP show all available methods</option>{methods.map((method) => <option value={method} key={method}>{friendlyMethod(method, methodNames)}</option>)}</select></label>
        </div>
        <div className="chipPromoCheckout">
          <label><span>Promotion code</span><input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder="Optional code" maxLength={32} /></label>
          <button type="button" disabled={loadingOptions || promoCode.trim().length < 3} onClick={() => setAppliedPromoCode(promoCode.trim().toUpperCase())}>Apply promotion</button>
          {appliedPromoCode && <button type="button" className="ghost" onClick={() => { setAppliedPromoCode(""); setPromoCode(""); }}>Remove</button>}
        </div>
        {optionsMessage && <p className="chipBillingOptionsMessage" role="status">{optionsMessage}</p>}
        {quote?.promotion && <div className="promo-quote-result" role="status"><header><strong>{quote.promotion.campaign.code}: {quote.promotion.campaign.name}</strong><span>Applied at checkout</span></header><p>{quote.promotion.disclosure.summary}</p></div>}

        <div className="billingPlanGrid">
          {plans.map((option) => {
            const active = selectedPlan === option.plan;
            const cardAmount = option.plan === selectedPlan ? amount : option.monthly * intervalMonths[interval];
            const blocked = option.plan === "PERSONAL_PRO" && props.workspaceType === "FAMILY";
            return <article className={["billingPlanCard", active ? "pending" : "", props.currentAccessPlan === option.plan ? "current" : ""].filter(Boolean).join(" ")} key={option.plan}>
              <div className="billingPlanCardTop"><div><span className="billingPlanName">{option.name}</span><strong>RM{cardAmount.toFixed(2)} / {intervalLabel[interval]}</strong></div>{props.currentAccessPlan === option.plan && <span className="billingPlanBadge">Current</span>}</div>
              <p>{option.description}</p>
              <button type="button" disabled={blocked} onClick={() => setSelectedPlan(option.plan)}>{blocked ? "Unavailable for Family" : active ? "Selected" : "Select plan"}</button>
            </article>;
          })}
        </div>

        <div className="chipBillingSummary">
          <div><span>Amount due</span><strong>RM{amount.toFixed(2)}</strong><small>{intervalLabel[interval]} · {renewalMethod === "AUTOMATIC" ? "automatic renewal" : "manual renewal"}{annualDiscount > 0 ? ` · ${annualDiscount}% annual discount` : ""}</small></div>
          <button type="button" disabled={!canContinue} onClick={() => props.selectPlan({ plan:selectedPlan, interval, renewalMethod, ...(preferredPaymentMethod ? { preferredPaymentMethod } : {}), ...(appliedPromoCode ? { promoCode:appliedPromoCode } : {}) })}>{props.busyPlan ? "Preparing secure checkout…" : isDowngrade ? "Schedule downgrade" : quote?.promotion?.disclosure.firstChargeAmount === 0 ? "Verify card and start trial" : "Continue to secure CHIP payment"}</button>
        </div>

        {Boolean(props.renewalHistory?.length) && <section className="chipRenewalHistory" aria-labelledby="chip-renewal-history-title"><div><h3 id="chip-renewal-history-title">Renewal history</h3><span>Latest billing records are retained for review.</span></div><div className="chipRenewalHistoryScroll"><table><thead><tr><th>Reference</th><th>Plan</th><th>Period</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>{props.renewalHistory?.map((renewal) => <tr key={renewal.id}><td>{renewal.invoiceReference}</td><td>{renewal.plan.replaceAll("_", " ")}</td><td>{intervalLabel[renewal.billingInterval]}</td><td>{renewal.currency} {Number(renewal.amountDue).toFixed(2)}</td><td>{displayDate(renewal.dueAt)}</td><td>{renewal.status}</td></tr>)}</tbody></table></div></section>}

        <footer className="billingModalFooter"><span>Card, FPX, DuitNow QR and Touch 'n Go availability is confirmed live by CHIP for the selected option.</span><span>Automatic renewal only shows methods that support recurring charges. Manual renewals receive reminders and a fresh payment link.</span><span>Access activates only after MyPocket verifies CHIP's signed payment notification. Downgrades take effect after the paid period.</span></footer>
      </section>
    </div>
  );
}
