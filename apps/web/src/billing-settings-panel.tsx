import { useEffect, useState } from "react";

type Settings = {
  annualDiscountPercent:number;
  personalFamilyGraceDays:number;
  businessGraceDays:number;
  version:number;
};

export function BillingSettingsPanel(props:{ apiBase:string; token:string }){
  const [settings, setSettings] = useState<Settings | null>(null);
  const [discount, setDiscount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
      throw new Error(payload?.error?.message ?? payload?.message ?? `HTTP ${response.status}`);
    }
    return payload as T;
  }

  async function refresh(){
    if(!props.token){ return; }
    setBusy(true);
    try{
      const next = await request<Settings>("/billing/admin/settings");
      setSettings(next);
      setDiscount(String(next.annualDiscountPercent));
      setMessage("");
    }catch(error){
      setMessage(error instanceof Error ? error.message : "Billing settings could not be loaded.");
    }finally{
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, [props.apiBase, props.token]);

  async function save(){
    if(!settings){ return; }
    setBusy(true);
    try{
      const next = await request<Settings>("/billing/admin/settings/annual-discount", {
        method:"PATCH",
        body:JSON.stringify({
          annualDiscountPercent:Number(discount),
          expectedVersion:settings.version,
        }),
      });
      setSettings(next);
      setDiscount(String(next.annualDiscountPercent));
      setMessage("Annual discount updated and retained in the billing audit trail.");
    }catch(error){
      setMessage(error instanceof Error ? error.message : "Annual discount could not be updated.");
    }finally{
      setBusy(false);
    }
  }

  return <section className="billingAdminPanel" aria-labelledby="billing-settings-title">
    <header><div><span>CHIP billing controls</span><h2 id="billing-settings-title">Subscription Settings</h2><p>Control the yearly-plan discount. Monthly and 6-month prices remain fixed.</p></div><button type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button></header>
    {message && <p className="billingAdminMessage" role="status">{message}</p>}
    <div className="billingAdminGrid">
      <label><span>Annual discount (%)</span><input type="number" min="0" max="100" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
      <div><span>Personal / Family grace</span><strong>{settings?.personalFamilyGraceDays ?? "—"} days</strong></div>
      <div><span>Business grace</span><strong>{settings?.businessGraceDays ?? "—"} days</strong></div>
      <button type="button" onClick={() => void save()} disabled={busy || !settings || !discount || Number(discount) < 0 || Number(discount) > 100}>{busy ? "Saving…" : "Save annual discount"}</button>
    </div>
  </section>;
}
