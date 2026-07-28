import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.imai.my/api/v1";

const STORAGE = {
  token: "imai_dashboard_token",
  terms: "imai_terms_accepted",
  onboarding: "imai_onboarding_completed",
  wizardStep: "imai_setup_wizard_step",
};

function googleLoginUrl(){
  return `${API_BASE}/auth/google`;
}

type Member = {
  memberId:string;
  userId:string;
  email:string;
  name:string | null;
  role:MemberRole;
  whatsappPhoneNumber:string | null;
};

type MemberRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";

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

type DashboardView =
  | "dashboard"
  | "transactions"
  | "whatsapp"
  | "google"
  | "admin"
  | "settings";

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

async function apiText(
  path:string,
  token?:string,
):Promise<string>{

  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        headers:{
          ...(token ? { Authorization:`Bearer ${token}` } : {}),
        },
      },
    );


  const text =
    await response.text();


  if(!response.ok){
    throw new Error(
      getApiTextErrorMessage(
        text,
        response.status,
      ),
    );
  }


  return text;
}

function getApiTextErrorMessage(
  text:string,
  status:number,
){

  try{

    const json =
      text
        ? JSON.parse(
          text,
        )
        : null;

    const code =
      json?.error?.code;

    if(code === "EVOLUTION_QR_NOT_FOUND"){

      return [
        "QR WhatsApp belum tersedia sekarang.",
        "Jika bot sudah connected, tekan Recheck status dan teruskan setup.",
        "Jika belum connected, restart/pair semula instance WhatsApp kemudian cuba buka QR lagi.",
      ].join(
        "\n",
      );

    }

    return json?.error?.message ||
      json?.message ||
      `HTTP ${status}`;

  }catch{

    return text ||
      `HTTP ${status}`;

  }

}

function escapeHtml(
  value:string,
){

  return value
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );

}

function buildQrPopupPage(
  title:string,
  message:string,
){

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(
      title,
    )}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #ecfdf8, #ffffff);
        color: #082326;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(92vw, 420px);
        padding: 28px;
        border: 1px solid #b8eee4;
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 24px 70px rgba(4, 47, 46, 0.12);
        text-align: center;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 24px;
      }

      p {
        margin: 0;
        color: #587076;
        line-height: 1.6;
        white-space: pre-line;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(
        title,
      )}</h1>
      <p>${escapeHtml(
        message,
      )}</p>
    </main>
  </body>
</html>`;

}

async function optionalApi<T>(
  path:string,
  token:string,
  fallback:T,
):Promise<T>{

  try{

    return await api<T>(
      path,
      token,
    );

  }catch{

    return fallback;

  }

}

function isPublicLandingHost(){
  const host =
    window.location.hostname;

  return (
    host === "imai.my"
    ||
    host === "www.imai.my"
  );
}


function getWorkspaceOnboardingCompletedAt(
  data:DashboardData,
){

  return data.me?.workspace?.onboardingCompletedAt
    ?? null;

}


function hasConnectedGoogleSheet(
  data:DashboardData,
){

  return Boolean(
    data.google?.spreadsheetId,
  );

}



function App(){

  if(isPublicLandingHost()){
    return <PublicLanding />;
  }

  const [token, setToken] =
    useState(
      stored(STORAGE.token),
    );

  const [termsAccepted, setTermsAccepted] =
    useState(
      false,
    );

  const [onboardingCompleted, setOnboardingCompleted] =
    useState(
      false,
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

  const [preferredWizardStep, setPreferredWizardStep] =
    useState(
      stored(STORAGE.wizardStep),
    );

  const workspaceId =
    data.me?.workspace?.id
    ?? "";

  const onboardingStorage =
    useMemo(
      () =>
        workspaceId
          ?
          {
            terms:
              `${STORAGE.terms}:${workspaceId}`,

            onboarding:
              `${STORAGE.onboarding}:${workspaceId}`,
          }
          :
          null,
      [
        workspaceId,
      ],
    );

  useEffect(() => {

    if(!onboardingStorage){

      setTermsAccepted(false);
      setOnboardingCompleted(false);
      return;

    }

    const serverCompleted =
      Boolean(
        getWorkspaceOnboardingCompletedAt(
          data,
        ),
      );


    if(serverCompleted){

      localStorage.setItem(
        onboardingStorage.terms,
        "true",
      );

      localStorage.setItem(
        onboardingStorage.onboarding,
        "true",
      );

      setTermsAccepted(true);
      setOnboardingCompleted(true);
      return;

    }

    setTermsAccepted(
      isStoredTrue(
        onboardingStorage.terms,
      ),
    );

    setOnboardingCompleted(
      isStoredTrue(
        onboardingStorage.onboarding,
      ),
    );

  }, [
    onboardingStorage,
    getWorkspaceOnboardingCompletedAt(
      data,
    ),
  ]);

  useEffect(() => {

    const hash =
      new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );

    const authToken =
      hash.get("token");


    const googleError =
      hash.get("google") === "error"
        ?
        hash.get("message")
        :
        "";

    const isGoogleLogin =
      hash.get("auth") === "google"
      &&
      authToken;


    if(isGoogleLogin){

      localStorage.setItem(
        STORAGE.token,
        authToken,
      );

      setToken(authToken);

    }


    if(googleError){

      localStorage.setItem(
        STORAGE.wizardStep,
        "google",
      );

      setPreferredWizardStep("google");

      setNotice(
        googleError,
      );

      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search,
      );

      if(isGoogleLogin){
        loadAll(authToken);
      }

      return;

    }


    if(hash.get("google") === "connected"){

      setNotice(
        hash.get("message")
        ??
        "Google Workspace connected successfully.",
      );

      const nextStep =
        hash.get("next")
        ??
        "whatsapp";

      localStorage.setItem(
        STORAGE.wizardStep,
        nextStep,
      );

      setPreferredWizardStep(
        nextStep,
      );

      if(isGoogleLogin){
        setNotice(
          hash.get("message")
          ??
          "Google login successful. Google Sheet connected.",
        );
      }

      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search,
      );

      loadAll(
        authToken
        ??
        token,
      );

      return;

    }


    if(isGoogleLogin){

      localStorage.setItem(
        STORAGE.wizardStep,
        "welcome",
      );

      setPreferredWizardStep("welcome");
      setNotice("Google login successful. Welcome back.");

      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search,
      );

    }

  }, []);

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
          optionalApi<any | null>("/google/settings", activeToken, null),
          optionalApi<any | null>("/whatsapp/status", activeToken, null),
          optionalApi<Member[]>("/whatsapp/members", activeToken, []),
          optionalApi<any>("/transactions?limit=12", activeToken, []),
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

  function signOut(){

    localStorage.removeItem(
      STORAGE.token,
    );

    setToken("");
    setNotice("Signed out.");

  }

  function acceptTerms(){

    if(!onboardingStorage){

      setNotice("Workspace sedang dimuat. Sila cuba sebentar lagi.");
      return;

    }

    localStorage.setItem(
      onboardingStorage.terms,
      "true",
    );

    setTermsAccepted(true);
    setNotice("Terms accepted.");
  }

  async function finishOnboarding(){

    if(!onboardingStorage){

      setNotice("Workspace sedang dimuat. Sila cuba sebentar lagi.");
      return;

    }

    try{

      setState({
        loading:true,
        error:null,
      });


      const result =
        await api<any>(
          "/auth/onboarding/complete",
          token,
          {
            method:"POST",
            body:JSON.stringify({}),
          },
        );


      setData((current) => ({
        ...current,
        me:
          current.me
            ? {
              ...current.me,
              workspace:{
                ...current.me.workspace,
                onboardingCompletedAt:
                  result.workspace?.onboardingCompletedAt
                  ??
                  new Date()
                    .toISOString(),
              },
            }
            : current.me,
      }));


      localStorage.setItem(
        onboardingStorage.terms,
        "true",
      );

      localStorage.setItem(
        onboardingStorage.onboarding,
        "true",
      );

      localStorage.removeItem(
        STORAGE.wizardStep,
      );

      setTermsAccepted(true);
      setOnboardingCompleted(true);
      setNotice("Setup completed. Dashboard is ready.");
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
            : "Setup completion failed",
      });

    }
  }

  function resetWizard(){

    if(onboardingStorage){

      localStorage.removeItem(
        onboardingStorage.onboarding,
      );

    }

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

  async function connectGoogleSheet(){

    try{

      localStorage.setItem(
        STORAGE.wizardStep,
        "google",
      );

      setPreferredWizardStep("google");

      setState({
        loading:true,
        error:null,
      });

      window.location.href =
        googleLoginUrl();

    }catch(error){

      setState({
        loading:false,
        error:
          error instanceof Error
            ? error.message
            : "Google Sheet setup failed",
      });

    }

  }

  async function openWhatsAppQr(){

    const qrWindow =
      window.open(
        "",
        "mypocket-whatsapp-qr",
      );

    qrWindow
      ?.document
      .write(
        buildQrPopupPage(
          "Loading WhatsApp QR",
          "Sedang dapatkan QR pairing daripada server...",
        ),
      );

    qrWindow
      ?.document
      .close();

    try{

      const html =
        await apiText(
          "/whatsapp/qr",
          token,
        );

      if(
        qrWindow
        &&
        !qrWindow.closed
      ){

        qrWindow
          .document
          .open();

        qrWindow
          .document
          .write(
            html,
          );

        qrWindow
          .document
          .close();

        qrWindow
          .focus();

        return;

      }

      setNotice(
        "Browser block popup QR. Benarkan popup untuk app.imai.my kemudian tekan Open WhatsApp QR semula.",
      );

    }catch(error){

      const message =
        error instanceof Error
          ? error.message
          : "WhatsApp QR could not be opened.";

      if(
        qrWindow
        &&
        !qrWindow.closed
      ){

        qrWindow
          .document
          .open();

        qrWindow
          .document
          .write(
            buildQrPopupPage(
              "WhatsApp QR belum tersedia",
              message,
            ),
          );

        qrWindow
          .document
          .close();

      }

      setNotice(
        message,
      );

    }

  }

  const needsWizard =
    Boolean(token)
    &&
    Boolean(data.me?.workspace?.id)
    &&
    !(
      Boolean(
        getWorkspaceOnboardingCompletedAt(
          data,
        ),
      )
      &&
      hasConnectedGoogleSheet(
        data,
      )
    )
    &&
    (
      !termsAccepted
      ||
      !onboardingCompleted
    );

  if(
    token
    &&
    state.loading
    &&
    !data.me
  ){

    return (
      <main className="loginScreen">
        <section className="loginCard">
          <LogoBlock />

          <h1>Loading workspace...</h1>
          <p>Sedang semak status setup workspace anda.</p>
        </section>
      </main>
    );

  }

  if(!token){

    return (
      <TokenGate
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
        preferredStep={preferredWizardStep}
        termsAccepted={termsAccepted}
        acceptTerms={acceptTerms}
        finishOnboarding={finishOnboarding}
        refresh={() => loadAll()}
        notice={notice}
        installApp={installApp}
        connectGoogleSheet={connectGoogleSheet}
        openWhatsAppQr={openWhatsAppQr}
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
      connectGoogleSheet={connectGoogleSheet}
      openWhatsAppQr={openWhatsAppQr}
      signOut={signOut}
    />
  );

}

function TokenGate(
  props:{
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
          Login menggunakan Google untuk membuka workspace, setup wizard,
          WhatsApp bot dan Google Sheet anda.
        </p>

        <a
          className="googleButton"
          href={googleLoginUrl()}
        >
          <span>G</span>
          Continue with Google
        </a>

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
    preferredStep:string;
    termsAccepted:boolean;
    acceptTerms:() => void;
    finishOnboarding:() => void | Promise<void>;
    refresh:() => void;
    notice:string;
    installApp:() => void;
    connectGoogleSheet:() => void;
    openWhatsAppQr:() => void;
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

  const hasGoogleSheet =
    Boolean(
      props.data.google?.spreadsheetId,
    );

  const whatsappStatus =
    String(
      props.data.whatsapp?.instance?.status
      ??
      "",
    );

  const isWhatsAppConnected =
    [
      "OPEN",
      "CONNECTED",
      "DEV_CONNECTED",
    ].includes(
      whatsappStatus
        .toUpperCase(),
    );

  const hasWhatsApp =
    isWhatsAppConnected;

  const whatsappRequired =
    isShared;

  const whatsappReady =
    hasWhatsApp
    ||
    !whatsappRequired;

  const setupReady =
    props.termsAccepted
    &&
    hasGoogleSheet
    &&
    whatsappReady;

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

  useEffect(() => {

    const target =
      (
        props.preferredStep
        ||
        stored(STORAGE.wizardStep)
      )
        .trim()
        .toLowerCase();

    if(!target){
      return;
    }

    const index =
      steps.findIndex(
        (item) => item.toLowerCase() === target,
      );

    if(index >= 0){
      setStep(index);
    }

  }, [
    props.preferredStep,
    steps.join("|"),
  ]);

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

  function finishActionLabel(){

    if(!props.termsAccepted){

      return "Accept terms first";

    }


    if(!hasGoogleSheet){

      return "Connect Google Sheet";

    }


    if(
      whatsappRequired
      &&
      !hasWhatsApp
    ){

      return "Pair WhatsApp bot";

    }


    return "Open Dashboard";

  }

  function handleFinishAction(){

    if(!props.termsAccepted){

      setStep(
        steps.indexOf(
          "Terms",
        ),
      );

      return;

    }


    if(!hasGoogleSheet){

      props.connectGoogleSheet();
      return;

    }


    if(
      whatsappRequired
      &&
      !hasWhatsApp
    ){

      setStep(
        steps.indexOf(
          "WhatsApp",
        ),
      );

      return;

    }


    props.finishOnboarding();

  }

  function handlePrimaryAction(){

    if(
      current === "Google"
      &&
      !hasGoogleSheet
    ){

      props.connectGoogleSheet();
      return;

    }


    if(current === "Finish"){

      handleFinishAction();
      return;

    }


    next();

  }

  function primaryActionLabel(){

    if(
      current === "Google"
      &&
      !hasGoogleSheet
    ){

      return "Connect Google Sheet";

    }


    if(current === "Finish"){

      return finishActionLabel();

    }


    return "Next";

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

              {!props.data.google?.spreadsheetId && (
                <button
                  className="primary"
                  onClick={props.connectGoogleSheet}
                >
                  Connect Google Sheet
                </button>
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
              text={
                isWhatsAppConnected
                  ? "WhatsApp bot sudah paired. QR tidak diperlukan lagi untuk setup ini."
                  : "Scan QR untuk pair nombor WhatsApp yang akan menjadi bot MyPocket."
              }
            >
              <StatusGrid
                rows={[
                  ["Instance", props.data.whatsapp?.instance?.instanceName || "imai-dev"],
                  ["Status", isWhatsAppConnected ? "Connected" : props.data.whatsapp?.instance?.status || "Not paired"],
                  ["Members linked", `${linked}/${props.data.members.length}`],
                ]}
              />

              <p className="hint">
                {isWhatsAppConnected
                  ? "Bot sudah aktif. Jika mahu tukar nombor bot, disconnect/restart instance dahulu sebelum buka QR baru."
                  : "Buka QR, kemudian di WhatsApp pergi ke Linked devices → Link a device → scan QR."}
              </p>

              <button
                className="secondary"
                onClick={props.refresh}
              >
                Recheck status
              </button>

              {!isWhatsAppConnected && (
                <button
                  className="primary"
                  onClick={props.openWhatsAppQr}
                >
                  Open WhatsApp QR
                </button>
              )}
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
              title={setupReady ? "Setup ready" : "Complete setup"}
              text={
                setupReady
                  ? "Semua item wajib sudah selesai. Anda boleh buka dashboard sekarang."
                  : "Selesaikan item wajib sebelum membuka dashboard."
              }
            >
              <SetupChecklist
                items={[
                  {
                    done:
                      props.termsAccepted,

                    text:
                      props.termsAccepted
                        ? "Terms accepted"
                        : "Accept terms first",
                  },

                  {
                    done:
                      hasGoogleSheet,

                    text:
                      hasGoogleSheet
                        ? "Google Sheet connected"
                        : "Connect Google Sheet",
                  },

                  {
                    done:
                      whatsappReady,

                    text:
                      hasWhatsApp
                        ? "WhatsApp bot connected"
                        : whatsappRequired
                          ? "Open WhatsApp QR and pair bot"
                          : "WhatsApp pairing can be completed later",
                  },
                ]}
              />

              <button
                className="primary"
                onClick={handleFinishAction}
              >
                {finishActionLabel()}
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
              onClick={handlePrimaryAction}
            >
              {primaryActionLabel()}
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
    connectGoogleSheet:() => void;
    openWhatsAppQr:() => void;
    signOut:() => void;
  },
){

  const [activeView, setActiveView] =
    useState<DashboardView>("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [actionMessage, setActionMessage] =
    useState("");

  const [linkEmail, setLinkEmail] =
    useState("");

  const [linkPhone, setLinkPhone] =
    useState("");

  const [newMemberEmail, setNewMemberEmail] =
    useState("");

  const [newMemberRole, setNewMemberRole] =
    useState<MemberRole>("MEMBER");

  const actorRole =
    (
      props.data.me?.workspace?.role ||
      "VIEWER"
    ) as MemberRole;

  const canManageMembers =
    actorRole === "OWNER" ||
    actorRole === "ADMIN";

  const workspaceType =
    props.data.me?.workspace?.type ||
    props.data.google?.templateType ||
    "PERSONAL";

  const isSharedWorkspace =
    workspaceType === "FAMILY" ||
    workspaceType === "BUSINESS";

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

  const navItems:Array<{
    icon:string;
    label:string;
    view:DashboardView;
  }> =
    [
      {
        icon:"⌂",
        label:"Dashboard",
        view:"dashboard",
      },
      {
        icon:"▤",
        label:"Transactions",
        view:"transactions",
      },
      {
        icon:"☏",
        label:"WhatsApp",
        view:"whatsapp",
      },
      {
        icon:"▦",
        label:"Google Sheet",
        view:"google",
      },
      ...(canManageMembers
        ? [
          {
            icon:"👥",
            label:"Admin",
            view:"admin" as DashboardView,
          },
        ]
        : []),
      {
        icon:"⚙",
        label:"Settings",
        view:"settings",
      },
    ];

  function goToView(
    view:DashboardView,
  ){

    setActiveView(view);
    setActionMessage("");

  }

  function showActionMessage(
    message:string,
    view?:DashboardView,
  ){

    if(view){
      setActiveView(view);
    }

    setActionMessage(message);

  }

  function openGoogleSheet(){

    if(props.data.google?.spreadsheetId){

      window.open(
        `https://docs.google.com/spreadsheets/d/${props.data.google.spreadsheetId}`,
        "_blank",
        "noopener,noreferrer",
      );

      return;

    }

    props.connectGoogleSheet();

  }

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
    setActionMessage("WhatsApp number linked.");
    props.refresh();
  }

  async function addMember(){

    const token =
      stored(STORAGE.token);

    await api(
      "/members",
      token,
      {
        method:"POST",
        body:JSON.stringify({
          email:newMemberEmail,
          role:newMemberRole,
        }),
      },
    );

    setNewMemberEmail("");
    setNewMemberRole("MEMBER");
    setActionMessage("Member added.");
    props.refresh();
  }

  async function updateMemberRole(
    memberId:string,
    role:MemberRole,
  ){

    const token =
      stored(STORAGE.token);

    await api(
      `/members/${memberId}/role`,
      token,
      {
        method:"PATCH",
        body:JSON.stringify({
          role,
        }),
      },
    );

    setActionMessage("Member role updated.");
    props.refresh();
  }

  async function removeMember(
    memberId:string,
  ){

    const confirmed =
      window.confirm(
        "Remove this member from workspace?",
      );

    if(!confirmed){
      return;
    }

    const token =
      stored(STORAGE.token);

    await api(
      `/members/${memberId}`,
      token,
      {
        method:"DELETE",
      },
    );

    setActionMessage("Member removed.");
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

    setActionMessage("WhatsApp number unlinked.");
    props.refresh();
  }

  return (
    <div className={sidebarOpen ? "appShell" : "appShell sidebarCollapsed"}>
      <aside className="sidebar">
        <LogoBlock />
        <nav className="nav">
          {navItems.map((item) => (
            <button
              className={activeView === item.view ? "active" : ""}
              onClick={() => goToView(item.view)}
              key={item.view}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sideCard">
          <strong>Pro Plan</strong>
          <span>Active</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topIdentity">
            <button
              className="menu"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
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
            <button
              className="ghost"
              onClick={props.signOut}
            >
              Logout
            </button>
          </div>
        </header>

        {props.notice && (
          <div className="notice">
            {props.notice}
          </div>
        )}

        {actionMessage && (
          <div className="notice">
            {actionMessage}
          </div>
        )}

        {props.state.error && (
          <div className="errorBox">
            {props.state.error}
          </div>
        )}

        {activeView === "dashboard" && (
          <section className="kpis">
          <Kpi icon="▣" label="Today Expense" value={money(todayExpense)} sub="From latest transactions" />
          <Kpi icon="▤" label="Recent Expense" value={money(monthExpense)} sub="Latest dashboard sample" />
          <Kpi icon="☏" label="WhatsApp" value={props.data.whatsapp?.instance?.status || "Checking"} sub={`${linked}/${props.data.members.length} members linked`} />
          <Kpi icon="▦" label="Google Sheet" value={props.data.google?.spreadsheetId ? "Connected" : "Checking"} sub={props.data.google?.spreadsheetTitle || "Workspace sheet"} />
          </section>
        )}

        <section className="grid">
          {(activeView === "dashboard" || activeView === "transactions") && (
            <Panel title={activeView === "transactions" ? "Transactions" : "Recent Transactions"} wide>
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
              {activeView === "transactions" && (
                <div className="panelActions">
                  <button
                    className="primary"
                    onClick={() => showActionMessage(
                      "Untuk tambah transaksi sekarang, hantar mesej ke WhatsApp bot seperti: makan nasi rm8 tng. Form transaksi manual web akan dibuat dalam batch seterusnya.",
                    )}
                  >
                    Add Transaction
                  </button>

                  <button
                    className="ghost"
                    onClick={props.refresh}
                  >
                    Refresh transactions
                  </button>
                </div>
              )}
            </Panel>
          )}

          {(activeView === "dashboard" || activeView === "whatsapp") && (
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
              <div className="panelActions">
                <button
                  className="primary"
                  onClick={props.openWhatsAppQr}
                >
                  Open WhatsApp QR
                </button>

                <button
                  className="ghost"
                  onClick={props.refresh}
                >
                  Recheck status
                </button>
              </div>
            </Panel>
          )}

          {(activeView === "dashboard" || activeView === "google") && (
            <Panel title="Google Sheet">
            <StatusGrid
              rows={[
                ["Template", props.data.google?.templateType || "PERSONAL"],
                ["Title", props.data.google?.spreadsheetTitle || "-"],
                ["Mode", props.data.google?.mode || "-"],
              ]}
            />

            {props.data.google?.spreadsheetId && (
              <button
                className="primaryLink"
                onClick={openGoogleSheet}
              >
                Open Google Sheet
              </button>
            )}
              {!props.data.google?.spreadsheetId && (
                <button
                  className="primary"
                  onClick={props.connectGoogleSheet}
                >
                  Connect Google Sheet
                </button>
              )}
            </Panel>
          )}

          {activeView === "dashboard" && (
            <Panel title="Quick Actions" wide>
            <div className="actions">
              <Action
                title="Add Transaction"
                desc="Use WhatsApp message command."
                icon="+"
                onClick={() => showActionMessage(
                  "Hantar transaksi ke WhatsApp bot. Contoh: makan kedai mamak rm7.80 tng",
                  "transactions",
                )}
              />
              <Action title="Open WhatsApp QR" desc="Reconnect bot pairing." icon="☏" onClick={props.openWhatsAppQr} />
              <Action title="Setup Wizard" desc="Review onboarding steps." icon="⚙" onClick={props.resetWizard} />
            </div>
            </Panel>
          )}

          {canManageMembers && activeView === "admin" && (
            <Panel title="User Role Management" wide>
              <p className="helperText">
                Owner/Admin boleh tambah user, tukar role, remove member dan pautkan nombor WhatsApp.
                {isSharedWorkspace
                  ? " Family/Business workspace wajib mapping nombor WhatsApp untuk permission command."
                  : " Personal workspace boleh guna terus, tetapi role tetap boleh disediakan untuk upgrade nanti."}
              </p>

              <div className="memberCreate">
                <label className="field">
                  User email
                  <input
                    value={newMemberEmail}
                    onChange={(event) => setNewMemberEmail(event.target.value)}
                    placeholder="member@example.com"
                  />
                </label>

                <label className="field">
                  Role
                  <select
                    value={newMemberRole}
                    onChange={(event) => setNewMemberRole(event.target.value as MemberRole)}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </label>

                <button
                  className="primary"
                  onClick={addMember}
                >
                  Add member
                </button>
              </div>

              <div className="memberTable">
                {props.data.members.map((member) => {
                  const isOwner =
                    member.role === "OWNER";

                  const adminCannotEdit =
                    actorRole === "ADMIN" &&
                    (
                      member.role === "OWNER" ||
                      member.role === "ADMIN"
                    );

                  const canEditMember =
                    canManageMembers &&
                    !isOwner &&
                    !adminCannotEdit;

                  return (
                    <div className="memberRow" key={member.memberId}>
                      <div className="memberMain">
                        <strong>{member.name || member.email}</strong>
                        <span>{member.email}</span>
                        <span>{member.whatsappPhoneNumber || "WhatsApp belum linked"}</span>
                      </div>

                      <div className="memberControls">
                        <select
                          value={member.role}
                          disabled={!canEditMember}
                          onChange={(event) => updateMemberRole(
                            member.memberId,
                            event.target.value as MemberRole,
                          )}
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>

                        {member.whatsappPhoneNumber ? (
                          <button
                            className="ghost"
                            onClick={() => unlinkMember(member.memberId)}
                            disabled={!canEditMember}
                          >
                            Unlink WA
                          </button>
                        ) : (
                          <span className="mutedSmall">
                            <button
                              className="inlineButton"
                              onClick={() => {
                                setLinkEmail(member.email);
                                setActiveView("admin");
                                setActionMessage("Masukkan nombor WhatsApp untuk member ini di panel link.");
                              }}
                            >
                              Link below
                            </button>
                          </span>
                        )}

                        <button
                          className="ghost danger"
                          onClick={() => removeMember(member.memberId)}
                          disabled={!canEditMember}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {canManageMembers && activeView === "admin" && (
            <Panel title="Member WhatsApp Link">
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
          )}

          {activeView === "settings" && (
            <Panel title="Settings" wide>
              <StatusGrid
                rows={[
                  ["Workspace", props.data.me?.workspace?.name || "-"],
                  ["Workspace type", props.data.me?.workspace?.type || "PERSONAL"],
                  ["Your role", actorRole],
                  ["Email", props.data.me?.user?.email || "-"],
                  ["API", props.data.health ? "Healthy" : "Checking"],
                  ["Google Sheet", props.data.google?.spreadsheetId ? "Connected" : "Not connected"],
                  ["WhatsApp", props.data.whatsapp?.instance?.status || "-"],
                ]}
              />

              <div className="panelActions">
                <button className="primary" onClick={props.installApp}>
                  Install app
                </button>

                <button className="ghost" onClick={props.resetWizard}>
                  Open setup wizard
                </button>

                <button className="ghost" onClick={props.refresh}>
                  Refresh dashboard
                </button>

                <button className="ghost danger" onClick={props.signOut}>
                  Logout
                </button>
              </div>
            </Panel>
          )}
        </section>

        <button
          className="floating"
          onClick={props.refresh}
        >
          Refresh
        </button>

        <nav className="mobileNav">
          <button
            className={activeView === "dashboard" ? "active" : ""}
            onClick={() => goToView("dashboard")}
          >
            ⌂<span>Home</span>
          </button>
          <button
            className={activeView === "transactions" ? "active" : ""}
            onClick={() => goToView("transactions")}
          >
            ▤<span>Tx</span>
          </button>
          <button
            className={activeView === "whatsapp" ? "active" : ""}
            onClick={() => goToView("whatsapp")}
          >
            ☏<span>WA</span>
          </button>
          <button
            className={activeView === "settings" ? "active" : ""}
            onClick={() => goToView("settings")}
          >
            ⚙<span>Setup</span>
          </button>
        </nav>
      </main>
    </div>
  );

}


function PublicLanding(){

  return (
    <main className="publicPage">
      <header className="publicHeader">
        <LogoBlock />

        <nav className="publicNav">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="publicActions">
          <a className="secondaryLink" href="https://app.imai.my">
            Open Dashboard
          </a>
          <a className="primaryLinkButton" href="https://app.imai.my">
            Get Started
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <div className="heroTrust">
            AI-powered · Privacy first · You own your data
          </div>

          <h1>
            Record expenses through WhatsApp.
            <span> Sync to your own Google Sheet.</span>
          </h1>

          <p>
            MyPocket AI gives you a WhatsApp finance bot, a beautiful PWA dashboard,
            and seamless Google Sheet sync. Your workspace stays simple, fast and
            easy to control.
          </p>

          <p className="privacyLine">
            We do not ask for your Google or WhatsApp passwords. We only store
            minimum operational data needed to run the service securely.
          </p>

          <div className="heroButtons">
            <a className="primaryLinkButton" href="https://app.imai.my">
              Get Started Free →
            </a>

            <a className="secondaryLink light" href="#how">
              See How It Works
            </a>
          </div>

          <div className="heroTags">
            <span>WhatsApp bot</span>
            <span>Google Sheet sync</span>
            <span>PWA dashboard</span>
          </div>
        </div>

        <div className="heroVisual">
          <div className="phoneMock">
            <div className="phoneTop">9:41 · MyPocket AI</div>
            <div className="chat sent">makan nasi rm8 tng</div>
            <div className="chat reply">
              ✅ Recorded!<br />
              Item: Makan nasi<br />
              Amount: RM8.00<br />
              Category: Food<br />
              Payment: TNG
            </div>
            <div className="chatInput">Message</div>
          </div>

          <div className="dashMock">
            <div className="mockHeader">
              <strong>Overview</strong>
              <span>May 2026</span>
            </div>
            <div className="mockStats">
              <div><span>Total Expenses</span><strong>RM 1,268.50</strong></div>
              <div><span>Transactions</span><strong>42</strong></div>
              <div><span>Daily Average</span><strong>RM 40.92</strong></div>
            </div>
            <div className="donut"></div>
          </div>

          <div className="sheetMock">
            <strong>MyPocket AI · Expenses</strong>
            <table>
              <tbody>
                <tr><td>Date</td><td>Category</td><td>Amount</td></tr>
                <tr><td>24/05</td><td>Food</td><td>RM8.00</td></tr>
                <tr><td>24/05</td><td>Transport</td><td>RM30.00</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="how" className="publicSection">
        <h2>How it works</h2>
        <p>Get up and running in three simple steps.</p>

        <div className="steps">
          <PublicCard icon="▦" title="Connect Google" text="Connect your Google account and choose or create your Google Sheet." />
          <PublicCard icon="☏" title="Pair WhatsApp" text="Scan a QR code to pair your WhatsApp bot securely." />
          <PublicCard icon="✓" title="Start recording" text="Text your expenses naturally. MyPocket records and syncs automatically." />
        </div>
      </section>

      <section id="features" className="publicSection">
        <h2>Everything you need to manage money, your way</h2>

        <div className="featureGrid">
          <PublicCard icon="☏" title="WhatsApp Bot" text="Record expenses in seconds with natural language and instant confirmation." />
          <PublicCard icon="▦" title="Google Sheet Templates" text="Pre-built templates for Personal, Family and Business workspaces." />
          <PublicCard icon="▣" title="PWA Dashboard" text="Fast, installable dashboard for phone, tablet and desktop." />
          <PublicCard icon="👥" title="Family & Business Roles" text="Invite members, set roles, and protect commands with permissions." />
          <PublicCard icon="◔" title="Smart Summaries" text="Daily, weekly and monthly summaries by category and spend." />
          <PublicCard icon="✎" title="Edit & Undo" text="Fix recent transactions and sync changes back to your sheet." />
          <PublicCard icon="◆" title="Categories & Tags" text="Organize records with categories, merchants and payment methods." />
          <PublicCard icon="●" title="Simple Setup Wizard" text="Guided onboarding for terms, Google, WhatsApp and subscription." />
        </div>
      </section>

      <section id="privacy" className="publicSection privacyBand">
        <h2>Trust & privacy is our promise</h2>

        <div className="trustGrid">
          <PublicCard icon="🛡" title="You own your data" text="Your financial workspace lives in your Google Sheet. You can revoke access anytime." />
          <PublicCard icon="🔒" title="We don't ask for passwords" text="We never ask for Google or WhatsApp passwords." />
          <PublicCard icon="▤" title="Minimum data stored" text="We store only what is needed to run automation, sync and access control." />
          <PublicCard icon="✓" title="Secure by design" text="Connections use platform APIs and follow industry-standard security practices." />
        </div>
      </section>

      <section id="pricing" className="publicSection">
        <h2>Simple pricing, for everyone</h2>
        <p>Start free. Upgrade when you need more.</p>

        <div className="pricingGrid">
          <Plan title="Personal" price="RM 0" text="For individuals" features={["1 WhatsApp number", "Google Sheet sync", "PWA dashboard", "Basic summaries"]} />
          <Plan title="Family" price="RM 19" text="For households" highlight features={["Up to 5 WhatsApp numbers", "Roles & permissions", "Member mapping", "Priority support"]} />
          <Plan title="Business" price="RM 49" text="For small teams" features={["Up to 10 WhatsApp numbers", "Advanced audit log", "Business templates", "Priority support"]} />
        </div>
      </section>

      <section className="faq publicSection">
        <h2>Frequently asked questions</h2>

        <div className="faqGrid">
          <details open>
            <summary>Do you store my Google or WhatsApp passwords?</summary>
            <p>No. MyPocket AI never asks for those passwords.</p>
          </details>
          <details>
            <summary>Can I use my own Google Sheet?</summary>
            <p>Yes. Your workspace syncs to your own sheet.</p>
          </details>
          <details>
            <summary>Can I cancel anytime?</summary>
            <p>Yes. You can disconnect integrations and stop using the service anytime.</p>
          </details>
          <details>
            <summary>Is there a free plan?</summary>
            <p>Yes. Personal workspace starts free.</p>
          </details>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <h2>Ready to take control of your money?</h2>
          <p>Get started in less than two minutes.</p>
        </div>

        <div className="heroButtons">
          <a className="primaryLinkButton" href="https://app.imai.my">
            Get Started Free
          </a>
          <a className="secondaryLink light" href="https://app.imai.my">
            Open Dashboard
          </a>
        </div>
      </section>

      <footer className="publicFooter">
        <LogoBlock />
        <span>© 2026 MyPocket AI. All rights reserved.</span>
      </footer>
    </main>
  );

}



function PublicCard(
  props:{
    icon:string;
    title:string;
    text:string;
  },
){
  return (
    <article className="publicCard">
      <div className="publicIcon">{props.icon}</div>
      <h3>{props.title}</h3>
      <p>{props.text}</p>
    </article>
  );
}



function Plan(
  props:{
    title:string;
    price:string;
    text:string;
    features:string[];
    highlight?:boolean;
  },
){
  return (
    <article className={props.highlight ? "plan highlight" : "plan"}>
      {props.highlight && <span className="popular">Most Popular</span>}
      <h3>{props.title}</h3>
      <p>{props.text}</p>
      <strong>{props.price}<small>/month</small></strong>
      <ul>
        {props.features.map((feature) => (
          <li key={feature}>✓ {feature}</li>
        ))}
      </ul>
      <a href="https://app.imai.my">Get Started</a>
    </article>
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

function SetupChecklist(
  props:{
    items:Array<{
      done:boolean;
      text:string;
    }>;
  },
){
  return (
    <ul className="checklist setupChecklist">
      {props.items.map((item) => (
        <li
          key={item.text}
          className={item.done ? "done" : "pending"}
        >
          <span>{item.done ? "✓" : "•"}</span>
          {item.text}
        </li>
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
