import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.imai.my/api/v1";

const STORAGE = {
  token: "imai_dashboard_token",
  terms: "imai_terms_accepted",
  onboarding: "imai_onboarding_completed"
};

type Member = {
  memberId:string;
  userId:string;
  email:string;
  name:string | null;
  role:string;
  whatsappPhoneNumber:string | null;
};

type Transaction = {
  id:string;
  amount:string;
  currency:string;
  type:"EXPENSE" | "INCOME";
  description:string | null;
  transactionDate:string;
  source?:string | null;
  category?:{ name:string } | null;
  merchant?:{ name:string } | null;
  paymentMethod?:{ name:string } | null;
};

type LoadState = {
  loading:boolean;
  error:string | null;
};

type DashboardData = {
  health:any | null;
  me:any | null;
  google:any | null;
  whatsapp:any | null;
  members:Member[];
  transactions:Transaction[];
};

function stored(key:string){
  return localStorage.getItem(key) || "";
}

function isStoredTrue(key:string){
  return localStorage.getItem(key) === "true";
}

function money(value:unknown, currency = "MYR"){
  const amount =
    Number(value || 0);

  return `${currency} ${amount.toFixed(2)}`;
}

function listFrom<T>(payload:unknown):T[]{
  if(Array.isArray(payload)){
    return payload as T[];
  }

  if(payload && typeof payload === "object"){
    const data =
      payload as Record<string, unknown>;

    for(const key of ["data", "items", "transactions"]){
      if(Array.isArray(data[key])){
        return data[key] as T[];
      }
    }
  }

  return [];
}

async function api<T>(
  path:string,
  token?:string,
  init?:RequestInit,
):Promise<T>{

  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...init,
        headers:{
          "Content-Type":"application/json",
          ...(token ? { Authorization:`Bearer ${token}` } : {}),
          ...(init?.headers || {}),
        },
      },
    );

  const text =
    await response.text();

  const json =
    text
      ? JSON.parse(text)
      : null;

  if(!response.ok){
    throw new Error(
      json?.error?.message ||
      json?.message ||
      `HTTP ${response.status}`,
    );
  }

  return json as T;
}

function App(){

  const [token, setToken] =
    useState(
      stored(STORAGE.token),
    );

  const [draftToken, setDraftToken] =
    useState(
      stored(STORAGE.token),
    );

  const [termsAccepted, setTermsAccepted] =
    useState(
      isStoredTrue(STORAGE.terms),
    );

  const [onboardingCompleted, setOnboardingCompleted] =
    useState(
      isStoredTrue(STORAGE.onboarding),
    );

  const [state, setState] =
    useState<LoadState>({
      loading:false,
      error:null,
    });

  const [data, setData] =
    useState<DashboardData>({
      health:null,
      me:null,
      google:null,
      whatsapp:null,
      members:[],
      transactions:[],
    });

  const [notice, setNotice] =
    useState("");

  const [installPrompt, setInstallPrompt] =
    useState<any>(null);

  useEffect(() => {

    if("serviceWorker" in navigator){
      navigator
        .serviceWorker
        .register("/sw.js")
        .catch(() => undefined);
    }

    const handler =
      (event:Event) => {
        event.preventDefault();
        setInstallPrompt(event);
      };

    window.addEventListener(
      "beforeinstallprompt",
      handler,
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler,
      );
    };

  }, []);

  async function loadAll(
    activeToken = token,
  ){

    setState({
      loading:true,
      error:null,
    });

    try{

      const health =
        await api<any>("/health");

      if(!activeToken){

        setData((current) => ({
          ...current,
          health,
        }));

        setState({
          loading:false,
          error:null,
        });

        return;

      }

      const [
        me,
        google,
        whatsapp,
        members,
        transactions,
      ] =
        await Promise.all([
          api<any>("/auth/me", activeToken),
          api<any>("/google/settings", activeToken),
          api<any>("/whatsapp/status", activeToken),
          api<Member[]>("/whatsapp/members", activeToken),
          api<any>("/transactions?limit=12", activeToken),
        ]);

      setData({
        health,
        me,
        google,
        whatsapp,
        members:
          listFrom<Member>(members),
        transactions:
          listFrom<Transaction>(transactions),
      });

      setState({
        loading:false,
        error:null,
      });

    }catch(error){

      setState({
        loading:false,
        error:
          error instanceof Error
            ? error.message
            : "Dashboard request failed",
      });

    }

  }

  useEffect(() => {
    loadAll();
  }, [token]);

  function saveToken(){

    const clean =
      draftToken.trim();

    localStorage.setItem(
      STORAGE.token,
      clean,
    );

    setToken(clean);
    setNotice("Login token saved.");
  }

  function acceptTerms(){

    localStorage.setItem(
      STORAGE.terms,
      "true",
    );

    setTermsAccepted(true);
    setNotice("Terms accepted.");
  }

  function finishOnboarding(){

    localStorage.setItem(
      STORAGE.onboarding,
      "true",
    );

    setOnboardingCompleted(true);
    setNotice("Setup completed. Dashboard is ready.");
  }

  function resetWizard(){

    localStorage.removeItem(
      STORAGE.onboarding,
    );

    setOnboardingCompleted(false);
  }

  async function installApp(){

    if(!installPrompt){
      setNotice("Jika button install tidak muncul, gunakan menu browser > Add to Home Screen.");
      return;
    }

    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  const needsWizard =
    Boolean(token)
    &&
    (
      !termsAccepted
      ||
      !onboardingCompleted
    );

  if(!token){

    return (
      <TokenGate
        draftToken={draftToken}
        setDraftToken={setDraftToken}
        saveToken={saveToken}
        health={data.health}
        error={state.error}
        installApp={installApp}
      />
    );

  }

  if(needsWizard){

    return (
      <SetupWizard
        data={data}
        state={state}
        termsAccepted={termsAccepted}
        acceptTerms={acceptTerms}
        finishOnboarding={finishOnboarding}
        refresh={() => loadAll()}
        notice={notice}
        installApp={installApp}
      />
    );

  }

  return (
    <Dashboard
      data={data}
      state={state}
      notice={notice}
      refresh={() => loadAll()}
      resetWizard={resetWizard}
      installApp={installApp}
    />
  );

}

function TokenGate(
  props:{
    draftToken:string;
    setDraftToken:(value:string) => void;
    saveToken:() => void;
    health:any | null;
    error:string | null;
    installApp:() => void;
  },
){

  return (
    <main className="loginScreen">
      <section className="loginCard">
        <LogoBlock />

        <h1>MyPocket AI Dashboard</h1>
        <p>
          Masukkan token login untuk membuka dashboard workspace.
          Selepas Google Auth sebenar siap, halaman ini akan auto-login dari session user.
        </p>

        <label className="field">
          Dashboard token
          <textarea
            value={props.draftToken}
            onChange={(event) => props.setDraftToken(event.target.value)}
            placeholder="Paste JWT token di sini"
          />
        </label>

        <button
          className="primary"
          onClick={props.saveToken}
        >
          Continue
        </button>

        <button
          className="secondary"
          onClick={props.installApp}
        >
          Install PWA on phone
        </button>

        <div className="loginStatus">
          API:
          {" "}
          {props.health ? "Healthy" : props.error || "Checking"}
        </div>
      </section>
    </main>
  );

}

function SetupWizard(
  props:{
    data:DashboardData;
    state:LoadState;
    termsAccepted:boolean;
    acceptTerms:() => void;
    finishOnboarding:() => void;
    refresh:() => void;
    notice:string;
    installApp:() => void;
  },
){

  const [step, setStep] =
    useState(0);

  const workspaceType =
    props.data.me?.workspace?.type ||
    props.data.google?.templateType ||
    "PERSONAL";

  const isShared =
    workspaceType === "FAMILY" ||
    workspaceType === "BUSINESS";

  const linked =
    props.data.members
      .filter(
        (member) => Boolean(
          member.whatsappPhoneNumber,
        ),
      )
      .length;

  const steps =
    [
      "Welcome",
      "Terms",
      "Google",
      "Workspace",
      "WhatsApp",
      ...(isShared ? ["Members"] : []),
      "Subscription",
      "Finish",
    ];

  const current =
    steps[step];

  function next(){
    setStep(
      Math.min(
        step + 1,
        steps.length - 1,
      ),
    );
  }

  function back(){
    setStep(
      Math.max(
        step - 1,
        0,
      ),
    );
  }

  return (
    <main className="wizardShell">
      <section className="wizardPanel">
        <div className="wizardSide">
          <LogoBlock />
          <h1>Setup MyPocket AI</h1>
          <p>
            Selesaikan setup pertama untuk aktifkan bot, dashboard dan Google Sheet sync.
          </p>

          <div className="stepList">
            {steps.map((item, index) => (
              <button
                className={index === step ? "step active" : "step"}
                onClick={() => setStep(index)}
                key={item}
              >
                <span>{index + 1}</span>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="wizardMain">
          {props.notice && (
            <div className="notice">
              {props.notice}
            </div>
          )}

          {current === "Welcome" && (
            <WizardCard
              title="Selamat datang ke MyPocket AI"
              text="Platform ini membantu anda merekod transaksi melalui WhatsApp bot, sync ke Google Sheet milik anda, dan memantau ringkasan kewangan melalui dashboard."
            >
              <Checklist
                items={[
                  "Dashboard web untuk pantau transaksi",
                  "WhatsApp bot untuk rekod perbelanjaan dan income",
                  "Google Sheet template sebagai workspace kewangan",
                  "PWA support untuk buka seperti app di phone",
                ]}
              />
            </WizardCard>
          )}

          {current === "Terms" && (
            <WizardCard
              title="Terms & Privacy"
              text="Sila baca dan setuju sebelum menggunakan servis."
            >
              <div className="termsBox">
                <p>
                  MyPocket AI menyediakan platform automasi bot, dashboard dan sync Google Sheet.
                </p>
                <p>
                  Data kewangan utama disimpan dan disusun di Google Sheet milik user atau workspace.
                </p>
                <p>
                  Sistem hanya menyimpan data minimum yang diperlukan untuk operasi seperti akaun, workspace, token sambungan, nombor WhatsApp yang dipautkan, status bot, permission dan rekod transaksi untuk fungsi dashboard/sync.
                </p>
                <p>
                  MyPocket AI tidak meminta password Google atau WhatsApp anda. Anda boleh disconnect integrasi bila-bila masa.
                </p>
                <p>
                  Untuk Family dan Business workspace, Owner/Admin bertanggungjawab memastikan ahli yang dipautkan mempunyai kebenaran yang sah.
                </p>
              </div>

              <button
                className={props.termsAccepted ? "primary done" : "primary"}
                onClick={props.acceptTerms}
              >
                {props.termsAccepted ? "Terms accepted" : "I agree"}
              </button>
            </WizardCard>
          )}

          {current === "Google" && (
            <WizardCard
              title="Google Sheet setup"
              text="Semak sambungan Google Workspace dan template sheet."
            >
              <StatusGrid
                rows={[
                  ["Status", props.data.google?.spreadsheetId ? "Connected" : "Not connected"],
                  ["Template", props.data.google?.templateType || "PERSONAL"],
                  ["Spreadsheet", props.data.google?.spreadsheetTitle || "-"],
                ]}
              />

              {props.data.google?.spreadsheetId && (
                <a
                  className="primaryLink"
                  href={`https://docs.google.com/spreadsheets/d/${props.data.google.spreadsheetId}`}
                  target="_blank"
                >
                  Open Google Sheet
                </a>
              )}
            </WizardCard>
          )}

          {current === "Workspace" && (
            <WizardCard
              title="Workspace type"
              text="Type workspace menentukan permission command dan cara ahli WhatsApp dipautkan."
            >
              <StatusGrid
                rows={[
                  ["Workspace", props.data.me?.workspace?.name || "-"],
                  ["Type", workspaceType],
                  ["Role", props.data.me?.workspace?.role || "-"],
                ]}
              />

              <p className="hint">
                Personal workspace boleh guna bot terus. Family dan Business akan memerlukan mapping nombor WhatsApp kepada ahli.
              </p>
            </WizardCard>
          )}

          {current === "WhatsApp" && (
            <WizardCard
              title="WhatsApp bot pairing"
              text="Semak status Evolution instance dan webhook."
            >
              <StatusGrid
                rows={[
                  ["Instance", props.data.whatsapp?.instance?.instanceName || "imai-dev"],
                  ["Status", props.data.whatsapp?.instance?.status || "-"],
                  ["Members linked", `${linked}/${props.data.members.length}`],
                ]}
              />

              <button
                className="secondary"
                onClick={props.refresh}
              >
                Recheck status
              </button>
            </WizardCard>
          )}

          {current === "Members" && (
            <WizardCard
              title="Member WhatsApp mapping"
              text="Family/Business perlu link nombor WhatsApp kepada ahli supaya command tidak digunakan oleh user yang salah."
            >
              <div className="memberList">
                {props.data.members.map((member) => (
                  <div
                    className="member"
                    key={member.memberId}
                  >
                    <div>
                      <strong>{member.role} {member.name || member.email}</strong>
                      <span>{member.whatsappPhoneNumber || "belum linked"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </WizardCard>
          )}

          {current === "Subscription" && (
            <WizardCard
              title="Subscription"
              text="Untuk sekarang status subscription disediakan sebagai placeholder dashboard. Billing sebenar boleh diaktifkan dalam sprint kemudian."
            >
              <div className="planBox">
                <strong>Pro Plan</strong>
                <span>Active for developer workspace</span>
              </div>

              <Checklist
                items={[
                  "Personal: bot + dashboard + Google Sheet",
                  "Family: multi-member permission",
                  "Business: team control dan audit lebih lengkap",
                ]}
              />
            </WizardCard>
          )}

          {current === "Finish" && (
            <WizardCard
              title="Setup completed"
              text="Dashboard sedia digunakan. Anda boleh install sebagai PWA di phone."
            >
              <button
                className="primary"
                onClick={props.finishOnboarding}
              >
                Open Dashboard
              </button>

              <button
                className="secondary"
                onClick={props.installApp}
              >
                Install on phone
              </button>
            </WizardCard>
          )}

          <div className="wizardActions">
            <button
              className="secondary"
              onClick={back}
              disabled={step === 0}
            >
              Back
            </button>

            <button
              className="primary"
              onClick={next}
              disabled={step === steps.length - 1}
            >
              Next
            </button>
          </div>

          {props.state.error && (
            <div className="errorBox">
              {props.state.error}
            </div>
          )}
        </div>
      </section>
    </main>
  );

}

function Dashboard(
  props:{
    data:DashboardData;
    state:LoadState;
    notice:string;
    refresh:() => void;
    resetWizard:() => void;
    installApp:() => void;
  },
){

  const [linkEmail, setLinkEmail] =
    useState("");

  const [linkPhone, setLinkPhone] =
    useState("");

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const todayExpense =
    props.data.transactions
      .filter(
        (item) =>
          item.type === "EXPENSE" &&
          item.transactionDate?.slice(0, 10) === today,
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

  const monthExpense =
    props.data.transactions
      .filter(
        (item) => item.type === "EXPENSE",
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

  const linked =
    props.data.members
      .filter(
        (member) => Boolean(
          member.whatsappPhoneNumber,
        ),
      )
      .length;

  async function linkMember(){

    const token =
      stored(STORAGE.token);

    await api(
      "/whatsapp/members/link",
      token,
      {
        method:"POST",
        body:JSON.stringify({
          email:linkEmail,
          phoneNumber:linkPhone,
        }),
      },
    );

    setLinkEmail("");
    setLinkPhone("");
    props.refresh();
  }

  async function unlinkMember(
    memberId:string,
  ){

    const token =
      stored(STORAGE.token);

    await api(
      `/whatsapp/members/${memberId}/phone`,
      token,
      {
        method:"DELETE",
      },
    );

    props.refresh();
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <LogoBlock />
        <nav className="nav">
          {[
            ["⌂", "Dashboard"],
            ["▤", "Transactions"],
            ["☏", "WhatsApp"],
            ["▦", "Google Sheet"],
            ["⚙", "Settings"],
          ].map(([icon, label], index) => (
            <a
              className={index === 0 ? "active" : ""}
              href={`#${label}`}
              key={label}
            >
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </nav>

        <div className="sideCard">
          <strong>Pro Plan</strong>
          <span>Active</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <button className="menu">☰</button>
            <span className="workspace">
              {props.data.me?.workspace?.name || "MyPocket Workspace"}
            </span>
            <span className="pill">
              {props.data.me?.workspace?.type || "PERSONAL"}
            </span>
          </div>

          <div className="topActions">
            <span className="status">
              ● API Healthy
            </span>
            <button
              className="ghost"
              onClick={props.installApp}
            >
              Install
            </button>
            <button
              className="ghost"
              onClick={props.resetWizard}
            >
              Setup
            </button>
          </div>
        </header>

        {props.notice && (
          <div className="notice">
            {props.notice}
          </div>
        )}

        {props.state.error && (
          <div className="errorBox">
            {props.state.error}
          </div>
        )}

        <section className="kpis">
          <Kpi icon="▣" label="Today Expense" value={money(todayExpense)} sub="From latest transactions" />
          <Kpi icon="▤" label="Recent Expense" value={money(monthExpense)} sub="Latest dashboard sample" />
          <Kpi icon="☏" label="WhatsApp" value={props.data.whatsapp?.instance?.status || "Checking"} sub={`${linked}/${props.data.members.length} members linked`} />
          <Kpi icon="▦" label="Google Sheet" value={props.data.google?.spreadsheetId ? "Connected" : "Checking"} sub={props.data.google?.spreadsheetTitle || "Workspace sheet"} />
        </section>

        <section className="grid">
          <Panel title="Recent Transactions" wide>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Merchant</th>
                    <th>Amount</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {props.data.transactions.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(item.transactionDate).toLocaleString("en-MY")}</td>
                      <td>
                        <span className={`type ${item.type.toLowerCase()}`}>
                          {item.type}
                        </span>
                      </td>
                      <td>{item.category?.name || "-"}</td>
                      <td>{item.merchant?.name || "-"}</td>
                      <td className={item.type === "INCOME" ? "incomeText" : "expenseText"}>
                        {money(item.amount, item.currency)}
                      </td>
                      <td>{item.source || "SYSTEM"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="WhatsApp">
            <StatusGrid
              rows={[
                ["Instance", props.data.whatsapp?.instance?.instanceName || "imai-dev"],
                ["Status", props.data.whatsapp?.instance?.status || "-"],
                ["Members", `${linked}/${props.data.members.length} linked`],
              ]}
            />

            <div className="memberList">
              {props.data.members.slice(0, 6).map((member) => (
                <div className="member" key={member.memberId}>
                  <div>
                    <strong>{member.role} {member.name || member.email}</strong>
                    <span>{member.whatsappPhoneNumber || "belum linked"}</span>
                  </div>

                  {member.whatsappPhoneNumber && (
                    <button
                      className="ghost danger"
                      onClick={() => unlinkMember(member.memberId)}
                    >
                      Unlink
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Google Sheet">
            <StatusGrid
              rows={[
                ["Template", props.data.google?.templateType || "PERSONAL"],
                ["Title", props.data.google?.spreadsheetTitle || "-"],
                ["Mode", props.data.google?.mode || "-"],
              ]}
            />

            {props.data.google?.spreadsheetId && (
              <a
                className="primaryLink"
                href={`https://docs.google.com/spreadsheets/d/${props.data.google.spreadsheetId}`}
                target="_blank"
              >
                Open Google Sheet
              </a>
            )}
          </Panel>

          <Panel title="Quick Actions" wide>
            <div className="actions">
              <Action title="Add Transaction" desc="Use WhatsApp message command." icon="+" />
              <Action title="Open WhatsApp QR" desc="Reconnect bot pairing." icon="☏" />
              <Action title="Setup Wizard" desc="Review onboarding steps." icon="⚙" onClick={props.resetWizard} />
            </div>
          </Panel>

          <Panel title="Member Link">
            <label className="field">
              Member email
              <input
                value={linkEmail}
                onChange={(event) => setLinkEmail(event.target.value)}
                placeholder="member@example.com"
              />
            </label>

            <label className="field">
              WhatsApp phone
              <input
                value={linkPhone}
                onChange={(event) => setLinkPhone(event.target.value)}
                placeholder="60123456789"
              />
            </label>

            <button
              className="primary"
              onClick={linkMember}
            >
              Link member
            </button>
          </Panel>
        </section>

        <button
          className="floating"
          onClick={props.refresh}
        >
          Refresh
        </button>

        <nav className="mobileNav">
          <button>⌂<span>Home</span></button>
          <button>▤<span>Tx</span></button>
          <button>☏<span>WA</span></button>
          <button>⚙<span>Setup</span></button>
        </nav>
      </main>
    </div>
  );

}

function LogoBlock(){
  return (
    <div className="brand">
      <div className="brandMark">μ</div>
      <span>MyPocket AI</span>
    </div>
  );
}

function WizardCard(
  props:{
    title:string;
    text:string;
    children?:React.ReactNode;
  },
){
  return (
    <article className="wizardCard">
      <h2>{props.title}</h2>
      <p>{props.text}</p>
      {props.children}
    </article>
  );
}

function Checklist(
  props:{
    items:string[];
  },
){
  return (
    <ul className="checklist">
      {props.items.map((item) => (
        <li key={item}>✓ {item}</li>
      ))}
    </ul>
  );
}

function StatusGrid(
  props:{
    rows:Array<[string, string]>;
  },
){
  return (
    <dl className="details">
      {props.rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function Kpi(
  props:{
    icon:string;
    label:string;
    value:string;
    sub:string;
  },
){
  return (
    <article className="kpi">
      <div className="kpiIcon">{props.icon}</div>
      <div>
        <span>{props.label}</span>
        <strong>{props.value}</strong>
        <small>{props.sub}</small>
      </div>
    </article>
  );
}

function Panel(
  props:{
    title:string;
    wide?:boolean;
    children:React.ReactNode;
  },
){
  return (
    <section className={props.wide ? "panel wide" : "panel"}>
      <div className="panelHeader">
        <h2>{props.title}</h2>
      </div>
      {props.children}
    </section>
  );
}

function Action(
  props:{
    title:string;
    desc:string;
    icon:string;
    onClick?:() => void;
  },
){
  return (
    <button
      className="action"
      onClick={props.onClick}
    >
      <span>{props.icon}</span>
      <strong>{props.title}</strong>
      <small>{props.desc}</small>
    </button>
  );
}

createRoot(
  document.getElementById("root")!,
).render(
  <App />,
);
