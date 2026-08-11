import { useEffect, useMemo, useState } from "react";

type PromotionStatus = "DRAFT" | "ENABLED" | "DISABLED" | "EXPIRED" | "ARCHIVED";
type PromotionType = "FREE_TRIAL_DAYS" | "PERCENTAGE" | "FIXED_AMOUNT";

type Campaign = {
  id:string;
  code:string;
  name:string;
  description:string | null;
  type:PromotionType;
  status:PromotionStatus;
  firstChargeBehavior:"CHARGE_DISCOUNTED_NOW" | "DEFER_UNTIL_TRIAL_END";
  discountValue:number;
  freeTrialDays:number | null;
  applicablePlans:string[];
  startsAt:string;
  endsAt:string;
  totalRedemptionLimit:number | null;
  perUserRedemptionLimit:number;
  newUsersOnly:boolean;
  requiresPaymentMethod:boolean;
  autoConvert:boolean;
  redemptionCount:number;
};

type UsageRow = {
  id:string;
  userEmail:string;
  plan:string;
  status:string;
  firstChargeAmount:number;
  nextChargeAt:string | null;
  redeemedAt:string;
  campaign:{ code:string; name:string };
};

type AuditRow = {
  id:string;
  actorEmail:string;
  action:string;
  createdAt:string;
};

type FormState = {
  code:string;
  name:string;
  description:string;
  type:PromotionType;
  discountValue:string;
  freeTrialDays:string;
  applicablePlans:string[];
  startsAt:string;
  endsAt:string;
  totalRedemptionLimit:string;
  perUserRedemptionLimit:string;
  newUsersOnly:boolean;
  requiresPaymentMethod:boolean;
  autoConvert:boolean;
};

const paidPlans = ["PERSONAL_PRO", "FAMILY", "BUSINESS"];

function inputDate(date:Date):string{
  return date.toISOString().slice(0, 16);
}

function blankForm():FormState{
  const start = new Date();
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return {
    code:"CUBA14",
    name:"CUBA14 New User Trial",
    description:"14-day free trial for new MyPocket users.",
    type:"FREE_TRIAL_DAYS",
    discountValue:"0",
    freeTrialDays:"14",
    applicablePlans:[...paidPlans],
    startsAt:inputDate(start),
    endsAt:inputDate(end),
    totalRedemptionLimit:"",
    perUserRedemptionLimit:"1",
    newUsersOnly:true,
    requiresPaymentMethod:true,
    autoConvert:true,
  };
}

function campaignForm(campaign:Campaign):FormState{
  return {
    code:campaign.code,
    name:campaign.name,
    description:campaign.description ?? "",
    type:campaign.type,
    discountValue:String(campaign.discountValue),
    freeTrialDays:campaign.freeTrialDays === null ? "" : String(campaign.freeTrialDays),
    applicablePlans:campaign.applicablePlans,
    startsAt:campaign.startsAt.slice(0, 16),
    endsAt:campaign.endsAt.slice(0, 16),
    totalRedemptionLimit:campaign.totalRedemptionLimit === null ? "" : String(campaign.totalRedemptionLimit),
    perUserRedemptionLimit:String(campaign.perUserRedemptionLimit),
    newUsersOnly:campaign.newUsersOnly,
    requiresPaymentMethod:campaign.requiresPaymentMethod,
    autoConvert:campaign.autoConvert,
  };
}

export function PromoCodeSettings(
  props:{ apiBase:string; token:string },
){
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [form, setForm] = useState<FormState>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"campaigns" | "usage" | "audit">("campaigns");

  async function request<T>(path:string, init?:RequestInit):Promise<T>{
    const response = await fetch(`${props.apiBase}${path}`, {
      ...init,
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${props.token}`,
        ...(init?.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if(!response.ok){
      throw new Error(payload?.message ?? payload?.error?.message ?? `HTTP ${response.status}`);
    }
    return payload as T;
  }

  async function refresh(){
    if(!props.token){ return; }
    setBusy(true);
    try{
      const [nextCampaigns, nextUsage, nextAudit] = await Promise.all([
        request<Campaign[]>("/promotion/admin/campaigns"),
        request<UsageRow[]>("/promotion/admin/usage?limit=100"),
        request<AuditRow[]>("/promotion/admin/audit?limit=100"),
      ]);
      setCampaigns(nextCampaigns);
      setUsage(nextUsage);
      setAudit(nextAudit);
      setMessage("");
    }catch(error){
      setMessage(error instanceof Error ? error.message : "Promotion settings could not be loaded");
    }finally{
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, [props.apiBase, props.token]);

  const payload = useMemo(() => ({
    code:form.code,
    name:form.name,
    description:form.description || null,
    type:form.type,
    firstChargeBehavior:form.type === "FREE_TRIAL_DAYS"
      ? "DEFER_UNTIL_TRIAL_END"
      : "CHARGE_DISCOUNTED_NOW",
    discountValue:Number(form.discountValue || 0),
    freeTrialDays:form.type === "FREE_TRIAL_DAYS" ? Number(form.freeTrialDays || 0) : null,
    currency:"MYR",
    applicablePlans:form.applicablePlans,
    startsAt:new Date(form.startsAt).toISOString(),
    endsAt:new Date(form.endsAt).toISOString(),
    totalRedemptionLimit:form.totalRedemptionLimit ? Number(form.totalRedemptionLimit) : null,
    perUserRedemptionLimit:Number(form.perUserRedemptionLimit || 1),
    newUsersOnly:form.newUsersOnly,
    requiresPaymentMethod:form.requiresPaymentMethod,
    autoConvert:form.autoConvert,
  }), [form]);

  async function saveCampaign(){
    setBusy(true);
    try{
      await request(
        editingId
          ? `/promotion/admin/campaigns/${encodeURIComponent(editingId)}`
          : "/promotion/admin/campaigns",
        {
          method:editingId ? "PATCH" : "POST",
          body:JSON.stringify(payload),
        },
      );
      setMessage(editingId ? "Promotion updated." : "Promotion created as draft.");
      setEditingId(null);
      setForm(blankForm());
      await refresh();
    }catch(error){
      setMessage(error instanceof Error ? error.message : "Promotion could not be saved");
    }finally{
      setBusy(false);
    }
  }

  async function transition(campaign:Campaign, status:Exclude<PromotionStatus, "DRAFT">){
    if(!window.confirm(`${status.toLowerCase()} ${campaign.code}?`)){ return; }
    setBusy(true);
    try{
      await request(`/promotion/admin/campaigns/${encodeURIComponent(campaign.id)}/transition`, {
        method:"POST",
        body:JSON.stringify({ status }),
      });
      setMessage(`${campaign.code} is now ${status.toLowerCase()}.`);
      await refresh();
    }catch(error){
      setMessage(error instanceof Error ? error.message : "Promotion status could not be changed");
    }finally{
      setBusy(false);
    }
  }

  function update<K extends keyof FormState>(key:K, value:FormState[K]){
    setForm((current) => ({ ...current, [key]:value }));
  }

  return (
    <section className="promo-admin-shell" aria-labelledby="promo-settings-title">
      <header className="promo-admin-header">
        <div>
          <span>MyPocket-owned promotion controls</span>
          <h2 id="promo-settings-title">Promo Code Settings</h2>
          <p>No provider coupon is created. Every change and redemption is retained in the audit trail.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button>
      </header>

      <nav className="promo-admin-tabs" aria-label="Promotion settings views">
        {(["campaigns", "usage", "audit"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item === "campaigns" ? "Campaigns" : item === "usage" ? `Usage (${usage.length})` : `Audit (${audit.length})`}
          </button>
        ))}
      </nav>

      {message && <p className="promo-admin-message" role="status">{message}</p>}

      {tab === "campaigns" && (
        <>
          <div className="promo-admin-form">
            <label>Code<input value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} maxLength={32} /></label>
            <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label>Type<select value={form.type} onChange={(event) => update("type", event.target.value as PromotionType)}><option value="FREE_TRIAL_DAYS">Free-trial days</option><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed MYR</option></select></label>
            <label>{form.type === "FREE_TRIAL_DAYS" ? "Trial days" : "Discount value"}<input type="number" min="0" value={form.type === "FREE_TRIAL_DAYS" ? form.freeTrialDays : form.discountValue} onChange={(event) => update(form.type === "FREE_TRIAL_DAYS" ? "freeTrialDays" : "discountValue", event.target.value)} /></label>
            <label>Starts<input type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></label>
            <label>Ends<input type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></label>
            <label>Total limit (optional)<input type="number" min="1" value={form.totalRedemptionLimit} onChange={(event) => update("totalRedemptionLimit", event.target.value)} /></label>
            <label>Per-user limit<input type="number" min="1" value={form.perUserRedemptionLimit} onChange={(event) => update("perUserRedemptionLimit", event.target.value)} /></label>
            <label className="promo-admin-description">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
            <fieldset><legend>Applicable plans</legend>{paidPlans.map((plan) => <label key={plan}><input type="checkbox" checked={form.applicablePlans.includes(plan)} onChange={(event) => update("applicablePlans", event.target.checked ? [...form.applicablePlans, plan] : form.applicablePlans.filter((item) => item !== plan))} />{plan.replace("_", " ")}</label>)}</fieldset>
            <fieldset><legend>Eligibility and conversion</legend><label><input type="checkbox" checked={form.newUsersOnly} onChange={(event) => update("newUsersOnly", event.target.checked)} />New users only</label><label><input type="checkbox" checked={form.requiresPaymentMethod} onChange={(event) => update("requiresPaymentMethod", event.target.checked)} />Payment method required</label><label><input type="checkbox" checked={form.autoConvert} onChange={(event) => update("autoConvert", event.target.checked)} />Convert after trial</label></fieldset>
          </div>
          <div className="promo-admin-form-actions"><button type="button" onClick={() => void saveCampaign()} disabled={busy || form.applicablePlans.length === 0}>{editingId ? "Save changes" : "Create draft"}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(blankForm()); }}>Cancel edit</button>}</div>

          <div className="promo-admin-cards">
            {campaigns.map((campaign) => (
              <article key={campaign.id}>
                <header><strong>{campaign.code}</strong><span data-status={campaign.status}>{campaign.status}</span></header>
                <h3>{campaign.name}</h3>
                <p>{campaign.type === "FREE_TRIAL_DAYS" ? `${campaign.freeTrialDays} free days` : `${campaign.discountValue}${campaign.type === "PERCENTAGE" ? "%" : " MYR"} off first charge`}</p>
                <small>{campaign.redemptionCount} redemption(s) · {campaign.perUserRedemptionLimit}/user</small>
                <div><button type="button" onClick={() => { setEditingId(campaign.id); setForm(campaignForm(campaign)); }} disabled={busy || !["DRAFT", "DISABLED"].includes(campaign.status)}>Edit</button>{campaign.status === "DRAFT" || campaign.status === "DISABLED" ? <button type="button" onClick={() => void transition(campaign, "ENABLED")} disabled={busy}>Enable</button> : null}{campaign.status === "ENABLED" && <button type="button" onClick={() => void transition(campaign, "DISABLED")} disabled={busy}>Disable</button>}{["ENABLED", "DISABLED"].includes(campaign.status) && <button type="button" onClick={() => void transition(campaign, "EXPIRED")} disabled={busy}>Expire</button>}{campaign.status !== "ARCHIVED" && <button type="button" className="danger" onClick={() => void transition(campaign, "ARCHIVED")} disabled={busy}>Archive</button>}</div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "usage" && <div className="promo-admin-table"><table><thead><tr><th>Code</th><th>User</th><th>Plan</th><th>Status</th><th>First charge</th><th>Next charge</th><th>Redeemed</th></tr></thead><tbody>{usage.map((row) => <tr key={row.id}><td>{row.campaign.code}</td><td>{row.userEmail}</td><td>{row.plan}</td><td>{row.status}</td><td>RM{row.firstChargeAmount.toFixed(2)}</td><td>{row.nextChargeAt ? new Date(row.nextChargeAt).toLocaleString() : "—"}</td><td>{new Date(row.redeemedAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
      {tab === "audit" && <div className="promo-admin-table"><table><thead><tr><th>Time</th><th>Action</th><th>Actor</th></tr></thead><tbody>{audit.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.action}</td><td>{row.actorEmail}</td></tr>)}</tbody></table></div>}
    </section>
  );
}
