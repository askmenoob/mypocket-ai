import { useState } from "react";

type BillingPlan = "PERSONAL_PRO" | "FAMILY" | "BUSINESS";

type QuoteResponse = {
  campaign:{ code:string; name:string; type:string };
  eligible:boolean;
  reasons:string[];
  disclosure:{
    firstChargeAmount:number;
    trialEndsAt:string | null;
    nextChargeAt:string | null;
    nextChargeAmount:number | null;
    cancelBefore:string | null;
    requiresPaymentMethod:boolean;
    autoConvert:boolean;
    summary:string;
  };
};

const planAmounts:Record<BillingPlan, number> = {
  PERSONAL_PRO:9,
  FAMILY:19,
  BUSINESS:49,
};

const reasonLabels:Record<string, string> = {
  CAMPAIGN_NOT_ENABLED:"This promotion is not currently enabled.",
  CAMPAIGN_NOT_STARTED:"The promotion has not started.",
  CAMPAIGN_EXPIRED:"The promotion has expired.",
  PLAN_NOT_APPLICABLE:"The selected plan is not eligible.",
  TOTAL_LIMIT_REACHED:"The promotion usage limit has been reached.",
  PER_USER_LIMIT_REACHED:"You have already used this promotion.",
  NEW_USERS_ONLY:"This promotion is only for new users.",
  PAYMENT_METHOD_REQUIRED:"A payment method must be attached before activation.",
};

function dateLabel(value:string | null):string{
  return value ? new Date(value).toLocaleString() : "Not applicable";
}

export function PromoQuoteDisclosure(
  props:{ apiBase:string; token:string },
){
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState<BillingPlan>("PERSONAL_PRO");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function preview(){
    setBusy(true);
    setError("");
    setQuote(null);
    try{
      const response = await fetch(`${props.apiBase}/promotion/quote`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${props.token}`,
        },
        body:JSON.stringify({
          code,
          plan,
          originalAmount:planAmounts[plan],
          currency:"MYR",
          // Quote only: attachment is verified again at the future activation seam.
          paymentMethodAttached:false,
        }),
      });
      const payload = await response.json().catch(() => null);
      if(!response.ok){
        throw new Error(payload?.message ?? "Promotion could not be previewed");
      }
      setQuote(payload as QuoteResponse);
    }catch(nextError){
      setError(nextError instanceof Error ? nextError.message : "Promotion could not be previewed");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="promo-quote" aria-labelledby="promo-quote-title">
      <div className="promo-quote-heading">
        <div><span>Optional promotion</span><strong id="promo-quote-title">Preview code and charges</strong></div>
        <small>Preview only — no payment, redemption or checkout is created.</small>
      </div>
      <div className="promo-quote-controls">
        <label>Promo code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="CUBA14" maxLength={32} /></label>
        <label>Plan<select value={plan} onChange={(event) => setPlan(event.target.value as BillingPlan)}><option value="PERSONAL_PRO">Personal Pro — RM9</option><option value="FAMILY">Family — RM19</option><option value="BUSINESS">Business — RM49</option></select></label>
        <button type="button" disabled={busy || code.trim().length < 3 || !props.token} onClick={() => void preview()}>{busy ? "Checking…" : "Preview promotion"}</button>
      </div>
      {error && <p className="promo-quote-error" role="alert">{error}</p>}
      {quote && (
        <div className="promo-quote-result" role="status">
          <header><strong>{quote.campaign.code}: {quote.campaign.name}</strong><span>{quote.eligible ? "Eligible" : "Activation requirements"}</span></header>
          <p>{quote.disclosure.summary}</p>
          <dl><div><dt>First charge</dt><dd>RM{quote.disclosure.firstChargeAmount.toFixed(2)}</dd></div><div><dt>Trial expiry</dt><dd>{dateLabel(quote.disclosure.trialEndsAt)}</dd></div><div><dt>Next charge</dt><dd>{quote.disclosure.nextChargeAmount === null ? "None" : `RM${quote.disclosure.nextChargeAmount.toFixed(2)} on ${dateLabel(quote.disclosure.nextChargeAt)}`}</dd></div><div><dt>Cancel before</dt><dd>{dateLabel(quote.disclosure.cancelBefore)}</dd></div></dl>
          {quote.reasons.length > 0 && <ul>{quote.reasons.map((reason) => <li key={reason}>{reasonLabels[reason] ?? reason}</li>)}</ul>}
          {quote.disclosure.autoConvert && <p><strong>Conversion notice:</strong> the paid plan starts automatically after the trial unless cancelled before the stated deadline. Activation will separately require your confirmation and a valid payment method.</p>}
        </div>
      )}
    </section>
  );
}
