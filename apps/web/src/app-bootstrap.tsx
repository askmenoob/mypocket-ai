import { AppIcon } from "./app-icon";
import { AdminUserManagement } from "./admin-user-management";
import { PremiumDashboard } from "./premium-dashboard";
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

type WorkspaceType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";

type WorkspacePackage =
  | WorkspaceType
  | "PERSONAL_PRO";

type AdminUser = {
  userId:string;
  isSuperAdmin?:boolean;
  email:string;
  name:string | null;
  package:WorkspacePackage;
  subscriptionPlan:string;
  subscriptionStatus:string;
  workspace:{
    id:string;
    name:string;
    type:WorkspaceType;
    role?:string | null;
    memberCount:number;
    googleConnected:boolean;
    spreadsheetId?:string | null;
    whatsappCount:number;
    whatsappConnectedCount?:number;
  } | null;
  createdAt:string;
  updatedAt:string;
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
  adminUsers:AdminUser[];
  transactions:Transaction[];
};

type DashboardView =
  | "dashboard"
  | "transactions"
  | "whatsapp"
  | "google"
  | "admin"
  | "settings";

type WhatsAppQrMode =
  | "wizard"
  | "dashboard";

type WhatsAppQrState = {
  open:boolean;
  mode:WhatsAppQrMode;
  imageSrc:string;
  loading:boolean;
  error:string;
  expiresAt:number | null;
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
        "Jika bot sudah connected, QR tidak akan dibuka untuk device lain.",
        "Disconnect WhatsApp dahulu jika mahu pair semula.",
      ].join(
        "\n",
      );

    }

    if(code === "WHATSAPP_INSTANCE_ALREADY_CONNECTED"){

      return [
        "WhatsApp bot sudah connected.",
        "QR pairing hanya boleh dibuka selepas Disconnect WhatsApp.",
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

function emptyWhatsAppQrState():WhatsAppQrState{
  return {
    open:false,
    mode:"dashboard",
    imageSrc:"",
    loading:false,
    error:"",
    expiresAt:null,
  };
}

function extractQrImageSrc(
  html:string,
){

  const match =
    html.match(
      /<img\s+[^>]*src=["']([^"']+)["']/i,
    );

  return (
    match?.[1]
      ?.replace(
        /&amp;/g,
        "&",
      )
    ??
    ""
  );

}

function isWhatsAppInstanceConnected(
  status:unknown,
){

  return [
    "OPEN",
    "CONNECTED",
    "DEV_CONNECTED",
  ].includes(
    String(
      status
      ??
      "",
    )
      .toUpperCase(),
  );

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
      adminUsers:[],
      transactions:[],
    });

  const [notice, setNotice] =
    useState("");

  const [preferredWizardStep, setPreferredWizardStep] =
    useState(
      stored(STORAGE.wizardStep),
    );

  const [whatsAppQr, setWhatsAppQr] =
    useState<WhatsAppQrState>(
      emptyWhatsAppQrState,
    );

  const [qrNow, setQrNow] =
    useState(
      Date.now(),
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
          optionalApi<any>("/transactions/sheet", activeToken, null),
        ]);

      const fallbackTransactions =
        transactions === null
          ? await optionalApi<any>(
            "/transactions?limit=12",
            activeToken,
            [],
          )
          : transactions;


      const adminUsers =
        me?.isSuperAdmin          ? await api<AdminUser[]>(
            "/workspace/admin/users",
            activeToken,
          )
          : [];

      setData({
        health,
        me,
        google,
        whatsapp,
        members:
          listFrom<Member>(members),
        adminUsers:
          listFrom<AdminUser>(adminUsers),
        transactions:
          listFrom<Transaction>(fallbackTransactions),
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

  useEffect(() => {

    if(
      !whatsAppQr.open
      ||
      !whatsAppQr.expiresAt
    ){

      return;

    }


    const timer =
      window.setInterval(
        () => setQrNow(
          Date.now(),
        ),
        1000,
      );


    return () => window.clearInterval(
      timer,
    );

  }, [
    whatsAppQr.open,
    whatsAppQr.expiresAt,
  ]);

  useEffect(() => {

    if(
      !whatsAppQr.open
      ||
      !token
    ){

      return;

    }


    const poller =
      window.setInterval(
        () => {
          loadAll();
        },
        4000,
      );


    return () => window.clearInterval(
      poller,
    );

  }, [
    whatsAppQr.open,
    token,
  ]);

  useEffect(() => {

    if(
      whatsAppQr.open
      &&
      isWhatsAppInstanceConnected(
        data.whatsapp?.instance?.status,
      )
    ){

      setWhatsAppQr(
        emptyWhatsAppQrState(),
      );

      setNotice(
        "WhatsApp bot paired. QR ditutup secara automatik.",
      );

    }

  }, [
    whatsAppQr.open,
    data.whatsapp?.instance?.status,
  ]);

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


  async function recreateGoogleSheet(){

    const workspaceType =
      data.me?.workspace?.type ||
      "PERSONAL";

    const templateType =
      workspaceType === "FAMILY" ||
      workspaceType === "BUSINESS"
        ?
        workspaceType
        :
        "PERSONAL";

    const title =
      `MyPocket ${templateType[0]}${templateType.slice(1).toLowerCase()} Template`;

    const confirmed =
      window.confirm(
        `Recreate Google Sheet akan hasilkan sheet baru menggunakan template ${templateType} untuk workspace ${workspaceType}. Relink hanya reconnect permission; recreate sahaja yang tukar template. Teruskan?`,
      );


    if(!confirmed){

      return;

    }


    try{

      setNotice(
        "Sedang recreate Google Sheet...",
      );

      await api(
        "/google/settings/auto-create",
        token,
        {
          method:"POST",
          body:JSON.stringify({
            title,
          }),
        },
      );

      setNotice(
        "Google Sheet baru telah dibuat dan disambungkan kepada workspace.",
      );

      await loadAll();

    }catch(error){

      setNotice(
        error instanceof Error
          ? error.message
          : "Google Sheet recreate failed.",
      );

    }

  }


  async function openWhatsAppQr(
    mode:WhatsAppQrMode = "dashboard",
  ){

    setQrNow(
      Date.now(),
    );

    setWhatsAppQr({
      open:true,
      mode,
      imageSrc:"",
      loading:true,
      error:"",
      expiresAt:null,
    });

    try{

      const html =
        await apiText(
          "/whatsapp/qr",
          token,
        );

      const imageSrc =
        extractQrImageSrc(
          html,
        );


      if(!imageSrc){

        throw new Error(
          "QR WhatsApp belum tersedia sekarang. Jika bot sudah connected, disconnect dahulu sebelum pair semula.",
        );

      }


      const expiresAt =
        Date.now()
        +
        60_000;


      setQrNow(
        Date.now(),
      );

      setWhatsAppQr({
        open:true,
        mode,
        imageSrc,
        loading:false,
        error:"",
        expiresAt,
      });

      setNotice(
        "QR WhatsApp tersedia. Scan dalam masa lebih kurang 1 minit.",
      );

    }catch(error){

      const message =
        error instanceof Error
          ? error.message
          : "WhatsApp QR could not be opened.";

      setWhatsAppQr({
        open:true,
        mode,
        imageSrc:"",
        loading:false,
        error:message,
        expiresAt:null,
      });

      setNotice(
        message,
      );

    }

  }

  function closeWhatsAppQr(){

    setWhatsAppQr(
      emptyWhatsAppQrState(),
    );

  }


  async function resetWhatsAppInstance(
    mode?:WhatsAppQrMode,
  ){

    try{

      await api(
        "/whatsapp/instance/disconnect",
        token,
        {
          method:"POST",
          body:JSON.stringify({}),
        },
      );

      setNotice(
        "WhatsApp bot telah disconnected. Buka QR hanya jika mahu pair semula.",
      );

      setWhatsAppQr(
        emptyWhatsAppQrState(),
      );

      await loadAll();

      if(mode){

        await openWhatsAppQr(
          mode,
        );

      }

    }catch(error){

      setNotice(
        error instanceof Error
          ? error.message
          : "WhatsApp disconnect failed.",
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

  const qrSecondsLeft =
    whatsAppQr.expiresAt
      ? Math.max(
        0,
        Math.ceil(
          (
            whatsAppQr.expiresAt
            -
            qrNow
          )
          /
          1000,
        ),
      )
      : 0;

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
        resetWhatsAppInstance={resetWhatsAppInstance}
        whatsAppQr={whatsAppQr}
        qrSecondsLeft={qrSecondsLeft}
        closeWhatsAppQr={closeWhatsAppQr}
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
      recreateGoogleSheet={recreateGoogleSheet}
      openWhatsAppQr={openWhatsAppQr}
      resetWhatsAppInstance={resetWhatsAppInstance}
      whatsAppQr={whatsAppQr}
      qrSecondsLeft={qrSecondsLeft}
      closeWhatsAppQr={closeWhatsAppQr}
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
    openWhatsAppQr:(mode?:WhatsAppQrMode) => void;
    resetWhatsAppInstance:(mode?:WhatsAppQrMode) => void;
    whatsAppQr:WhatsAppQrState;
    qrSecondsLeft:number;
    closeWhatsAppQr:() => void;
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
                  onClick={() => props.openWhatsAppQr("wizard")}
                >
                  Open WhatsApp QR
                </button>
              )}

              {!isWhatsAppConnected && (
                <button
                  className="secondary"
                  onClick={() => props.resetWhatsAppInstance()}
                >
                  Generate fresh QR
                </button>
              )}

              {props.whatsAppQr.open && props.whatsAppQr.mode === "wizard" && (
                <WhatsAppQrPanel
                  qr={props.whatsAppQr}
                  secondsLeft={props.qrSecondsLeft}
                  inline
                  openQr={() => props.openWhatsAppQr("wizard")}
                  resetQr={() => props.resetWhatsAppInstance("wizard")}
                  closeQr={props.closeWhatsAppQr}
                />
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
    recreateGoogleSheet:() => void;
    openWhatsAppQr:(mode?:WhatsAppQrMode) => void;
    resetWhatsAppInstance:(mode?:WhatsAppQrMode) => void;
    whatsAppQr:WhatsAppQrState;
    qrSecondsLeft:number;
    closeWhatsAppQr:() => void;
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

  const [packageBusyUserId, setPackageBusyUserId] =
    useState("");

  const actorRole =
    (
      props.data.me?.workspace?.role ||
      "VIEWER"
    ) as MemberRole;

  const canManageMembers =
    actorRole === "OWNER" ||
    actorRole === "ADMIN";

  const isSuperAdmin =
    Boolean(
      props.data.me?.isSuperAdmin,
    );

  const canUseAdmin =
    canManageMembers ||
    isSuperAdmin;

  const workspaceType =
    props.data.me?.workspace?.type ||
    props.data.google?.templateType ||
    "PERSONAL";

  const googleSheetUrl =
    props.data.google?.spreadsheetId
      ?
      `https://docs.google.com/spreadsheets/d/${props.data.google.spreadsheetId}`
      :
      "";

  const backupGoogleSheetUrl =
    props.data.google?.backupSpreadsheetId
      ?
      `https://docs.google.com/spreadsheets/d/${props.data.google.backupSpreadsheetId}`
      :
      "";

  const googleTemplateType =
    props.data.google?.templateType
    ||
    "";

  const hasGoogleTemplateMismatch =
    Boolean(
      googleTemplateType
      &&
      googleTemplateType !== workspaceType,
    );

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

  const isWhatsAppConnected =
    isWhatsAppInstanceConnected(
      props.data.whatsapp?.instance?.status,
    );

  const navItems:Array<{
    icon:string;
    label:string;
    view:DashboardView;
  }> =
    [
      {
        icon:"home",
        label:"Dashboard",
        view:"dashboard",
      },
      {
        icon:"transactions",
        label:"Transactions",
        view:"transactions",
      },
      {
        icon:"whatsapp",
        label:"WhatsApp",
        view:"whatsapp",
      },
      {
        icon:"sheet",
        label:"Google Sheet",
        view:"google",
      },
      ...(canUseAdmin
        ? [
          {
            icon:"users",
            label:"Admin",
            view:"admin" as DashboardView,
          },
        ]
        : []),
      {
        icon:"settings",
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


  async function updateUserPackage(
    userId:string,
    packageType:WorkspacePackage,
  ){

    const token =
      stored(STORAGE.token);

    setPackageBusyUserId(
      userId,
    );

    try{

      await api(
        `/workspace/admin/users/${userId}/package`,
        token,
        {
          method:"PATCH",
          body:JSON.stringify({
            package:
              packageType,
          }),
        },
      );

      setActionMessage(
        "User package updated.",
      );

      props.refresh();

    }finally{

      setPackageBusyUserId("");

    }

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
              <span><AppIcon name={item.icon} size={17} strokeWidth={2} /></span>
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
          <PremiumDashboard
            data={props.data}
            onRefresh={props.refresh}
            onSetup={props.resetWizard}
            onRelinkGoogle={props.connectGoogleSheet}
            onRecreateGoogle={props.recreateGoogleSheet}
            onOpenTransactions={() =>
              setActiveView("transactions")
            }
            onOpenWhatsApp={() =>
              setActiveView("whatsapp")
            }
            onAddTransaction={() =>
              showActionMessage(
                "Untuk tambah transaksi, hantar mesej kepada WhatsApp bot seperti: makan nasi RM8 TNG.",
              )
            }
          />
        )}

        <section
          className={
            activeView === "dashboard"
              ? "grid pd-legacy-hidden"
              : "grid"
          }
        >
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
                {!isWhatsAppConnected && (
                  <button
                    className="primary"
                    onClick={() => props.openWhatsAppQr("dashboard")}
                  >
                    Open WhatsApp QR
                  </button>
                )}

                {isWhatsAppConnected && (
                  <button
                    className="ghost danger"
                    onClick={() => props.resetWhatsAppInstance()}
                  >
                    Disconnect WhatsApp
                  </button>
                )}

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
                  ["Workspace package", workspaceType],
                  ["Template", googleTemplateType || workspaceType],
                  ["Title", props.data.google?.spreadsheetTitle || "-"],
                  ["Backup", props.data.google?.backupSpreadsheetTitle || "-"],
                  ["Mode", props.data.google?.mode || "-"],
                ]}
              />

              {backupGoogleSheetUrl && (
                <div className="sheetWarning">
                  Backup Sheet dibuat dalam Google Drive anda untuk restore dan
                  redundancy. Jangan delete atau edit fail backup ini kecuali
                  anda memang mahu reset backup.
                </div>
              )}

              {hasGoogleTemplateMismatch && (
                <div className="sheetWarning">
                  Workspace sekarang ialah {workspaceType}, tetapi Google Sheet
                  yang tersambung masih menggunakan template {googleTemplateType}.
                  Jika mahu sheet ikut package semasa, recreate atau connect
                  semula Google Sheet.
                </div>
              )}

              {googleSheetUrl && (
                <div className="sheetUrlBox">
                  <span>Working Google Sheet URL</span>
                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {googleSheetUrl}
                  </a>
                </div>
              )}

              {backupGoogleSheetUrl && (
                <div className="sheetUrlBox backupSheetUrlBox">
                  <span>Backup Google Sheet URL — do not delete</span>
                  <a
                    href={backupGoogleSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {backupGoogleSheetUrl}
                  </a>
                </div>
              )}

            {props.data.google?.spreadsheetId && (
              <div className="panelActions sheetActions">
                <button
                  className="primary"
                  onClick={openGoogleSheet}
                >
                  Open Google Sheet
                </button>

                <button
                  className="ghost"
                  onClick={props.connectGoogleSheet}
                >
                  Relink Google Access
                </button>

                <button
                  className={hasGoogleTemplateMismatch ? "primary" : "ghost"}
                  onClick={props.recreateGoogleSheet}
                >
                  Recreate Google Sheet
                </button>
              </div>
            )}
              {!props.data.google?.spreadsheetId && (
                <div className="panelActions sheetActions">
                  <button
                    className="primary"
                    onClick={props.connectGoogleSheet}
                  >
                    Connect Google Sheet
                  </button>

                  <button
                    className="ghost"
                    onClick={props.recreateGoogleSheet}
                  >
                    Recreate Google Sheet
                  </button>
                </div>
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
              {isWhatsAppConnected
                ? (
                  <Action
                    title="Disconnect WhatsApp"
                    desc="Putuskan bot semasa sebelum pair semula."
                    icon="⏻"
                    onClick={() => props.resetWhatsAppInstance()}
                  />
                )
                : (
                  <Action
                    title="Open WhatsApp QR"
                    desc="Pair bot sekali dengan nombor WhatsApp anda."
                    icon="☏"
                    onClick={() => props.openWhatsAppQr("dashboard")}
                  />
                )}
              <Action title="Setup Wizard" desc="Review onboarding steps." icon="⚙" onClick={props.resetWizard} />
            </div>
            </Panel>
          )}

          {isSuperAdmin && activeView === "admin" && (
            <AdminUserManagement
              users={props.data.adminUsers}
              busyUserId={packageBusyUserId}
              message={actionMessage}
              onRefresh={props.refresh}
              onUpdatePackage={updateUserPackage}
            />
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

        {props.whatsAppQr.open && props.whatsAppQr.mode === "dashboard" && (
          <WhatsAppQrPanel
            qr={props.whatsAppQr}
            secondsLeft={props.qrSecondsLeft}
            openQr={() => props.openWhatsAppQr("dashboard")}
            resetQr={() => props.resetWhatsAppInstance("dashboard")}
            closeQr={props.closeWhatsAppQr}
          />
        )}

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


function WhatsAppQrPanel(
  props:{
    qr:WhatsAppQrState;
    secondsLeft:number;
    inline?:boolean;
    openQr:() => void;
    resetQr:() => void;
    closeQr:() => void;
  },
){

  const expired =
    Boolean(
      props.qr.expiresAt,
    )
    &&
    props.secondsLeft <= 0;

  const content =
    (
      <section className={props.inline ? "qrPanel inline" : "qrPanel"}>
        <div className="qrHeader">
          <div>
            <h2>WhatsApp pairing QR</h2>
            <p>
              Scan QR ini di WhatsApp → Linked devices → Link a device.
            </p>
          </div>

          <button
            className="iconButton"
            onClick={props.closeQr}
            aria-label="Close WhatsApp QR"
          >
            ×
          </button>
        </div>

        {props.qr.loading && (
          <div className="qrState">
            Sedang dapatkan QR daripada Evolution...
          </div>
        )}

        {props.qr.error && !props.qr.loading && (
          <div className="qrState warning">
            <strong>QR belum tersedia.</strong>
            <span>{props.qr.error}</span>
          </div>
        )}

        {props.qr.imageSrc && !props.qr.loading && !expired && (
          <div className="qrImageShell">
            <img
              className="qrImage"
              src={props.qr.imageSrc}
              alt="WhatsApp pairing QR code"
            />
          </div>
        )}

        {props.qr.imageSrc && !props.qr.loading && expired && (
          <div className="qrState warning">
            <strong>QR expired.</strong>
            <span>Generate QR baru sebelum scan untuk elak QR lama digunakan.</span>
          </div>
        )}

        {props.qr.expiresAt && !props.qr.loading && (
          <div className={expired ? "qrTimer expired" : "qrTimer"}>
            {expired
              ? "Expired"
              : `Expired dalam ${props.secondsLeft}s`}
          </div>
        )}

        <div className="qrActions">
          <button
            className="secondary"
            onClick={props.openQr}
          >
            Reload QR
          </button>

          <button
            className="primary"
            onClick={props.resetQr}
          >
            Generate fresh QR
          </button>
        </div>

        <p className="hint">
          Selepas bot connected, QR ini tidak boleh digunakan untuk pair device lain.
        </p>
      </section>
    );


  if(props.inline){

    return content;

  }


  return (
    <div className="qrModalBackdrop" role="dialog" aria-modal="true">
      {content}
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
          <Plan title="Personal Pro" price="RM 9" text="For power users" highlight features={["Personal template", "Backup Google Sheet", "Advanced WhatsApp commands", "Priority improvements"]} />
          <Plan title="Family" price="RM 19" text="For households" features={["Up to 5 WhatsApp numbers", "Roles & permissions", "Member mapping", "Priority support"]} />
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


function DashboardCharts(
  props:{
    transactions:Transaction[];
  },
){
  const expenseTransactions =
    props.transactions
      .filter((item) =>
        item.type === "EXPENSE" &&
        Number(item.amount) > 0,
      );

  const referenceDate =
    expenseTransactions.length > 0
      ? new Date(
          expenseTransactions
            .map((item) => new Date(item.transactionDate))
            .sort((a, b) => b.getTime() - a.getTime())[0],
        )
      : new Date();

  const referenceYear =
    referenceDate.getFullYear();

  const referenceMonth =
    referenceDate.getMonth();

  const monthExpenses =
    expenseTransactions.filter((item) => {
      const date =
        new Date(item.transactionDate);

      return (
        date.getFullYear() === referenceYear &&
        date.getMonth() === referenceMonth
      );
    });

  const daysInMonth =
    new Date(
      referenceYear,
      referenceMonth + 1,
      0,
    ).getDate();

  const dailyTotals =
    Array.from(
      {
        length:daysInMonth,
      },
      (_, index) => ({
        day:index + 1,
        amount:0,
      }),
    );

  for (const item of monthExpenses){
    const date =
      new Date(item.transactionDate);

    const dayIndex =
      date.getDate() - 1;

    if (
      dayIndex >= 0 &&
      dayIndex < dailyTotals.length
    ){
      dailyTotals[dayIndex].amount +=
        Number(item.amount) || 0;
    }
  }

  const categoryMap =
    new Map<string, number>();

  for (const item of monthExpenses){
    const category =
      item.category?.name?.trim() ||
      "Others";

    categoryMap.set(
      category,
      (categoryMap.get(category) || 0) +
        (Number(item.amount) || 0),
    );
  }

  const categoryColours = [
    "#079b83",
    "#34bfa5",
    "#3f7bd8",
    "#f4b72f",
    "#8467cf",
    "#ef6b67",
  ];

  const categories =
    Array.from(categoryMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort((a, b) =>
        b.amount - a.amount,
      );

  const visibleCategories =
    categories.slice(0, 5);

  if (categories.length > 5){
    visibleCategories.push({
      name:"Others",
      amount:categories
        .slice(5)
        .reduce(
          (total, item) =>
            total + item.amount,
          0,
        ),
    });
  }

  const totalExpense =
    monthExpenses.reduce(
      (total, item) =>
        total + (Number(item.amount) || 0),
      0,
    );

  const moneyLabel =
    (value:number) =>
      new Intl.NumberFormat(
        "en-MY",
        {
          style:"currency",
          currency:"MYR",
          minimumFractionDigits:2,
        },
      ).format(value);

  const chartWidth =
    760;

  const chartHeight =
    250;

  const chartPadding = {
    top:22,
    right:18,
    bottom:34,
    left:52,
  };

  const maxDaily =
    Math.max(
      ...dailyTotals.map((item) => item.amount),
      1,
    );

  const xFor =
    (index:number) =>
      chartPadding.left +
      (
        index /
        Math.max(dailyTotals.length - 1, 1)
      ) *
      (
        chartWidth -
        chartPadding.left -
        chartPadding.right
      );

  const yFor =
    (amount:number) =>
      chartPadding.top +
      (
        1 -
        amount / maxDaily
      ) *
      (
        chartHeight -
        chartPadding.top -
        chartPadding.bottom
      );

  const linePoints =
    dailyTotals
      .map(
        (item, index) =>
          `${xFor(index)},${yFor(item.amount)}`,
      )
      .join(" ");

  const areaPoints =
    [
      `${xFor(0)},${chartHeight - chartPadding.bottom}`,
      linePoints,
      `${xFor(dailyTotals.length - 1)},${chartHeight - chartPadding.bottom}`,
    ].join(" ");

  let accumulatedPercent =
    0;

  const donutStops:string[] = [];

  visibleCategories.forEach(
    (item, index) => {
      const percentage =
        totalExpense > 0
          ? item.amount / totalExpense * 100
          : 0;

      const start =
        accumulatedPercent;

      const end =
        accumulatedPercent + percentage;

      donutStops.push(
        `${categoryColours[index % categoryColours.length]} ${start}% ${end}%`,
      );

      accumulatedPercent =
        end;
    },
  );

  const donutBackground =
    totalExpense > 0
      ? `conic-gradient(${donutStops.join(",")})`
      : "conic-gradient(#dfe9e7 0% 100%)";

  const monthLabel =
    referenceDate.toLocaleDateString(
      "en-MY",
      {
        month:"long",
        year:"numeric",
      },
    );

  const yGuides =
    [0, 0.25, 0.5, 0.75, 1];

  return (
    <>
      <style>{`
        .dashboardCharts {
          display:grid;
          grid-template-columns:minmax(0,1.65fr) minmax(320px,1fr);
          gap:12px;
          margin-top:12px;
        }

        .dashboardChartCard {
          min-width:0;
          padding:18px;
          border:1px solid #dce8e5;
          border-radius:14px;
          background:#ffffff;
          box-shadow:0 8px 26px rgba(5,50,49,.04);
        }

        .dashboardChartHeader {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:14px;
          margin-bottom:14px;
        }

        .dashboardChartHeader h3 {
          margin:0;
          color:#102f31;
          font-size:16px;
        }

        .dashboardChartHeader span {
          display:block;
          margin-top:4px;
          color:#78908e;
          font-size:12px;
        }

        .dashboardChartBadge {
          flex:0 0 auto;
          margin:0 !important;
          padding:6px 10px;
          border:1px solid #dbe9e6;
          border-radius:8px;
          background:#f7fbfa;
          color:#3d605d !important;
          font-weight:700;
        }

        .expenseChartSvg {
          display:block;
          width:100%;
          height:auto;
          overflow:visible;
        }

        .expenseChartEmpty {
          padding:64px 20px;
          color:#78908e;
          text-align:center;
        }

        .categoryChartBody {
          display:grid;
          grid-template-columns:170px minmax(0,1fr);
          align-items:center;
          gap:22px;
          min-height:260px;
        }

        .donutChart {
          position:relative;
          width:170px;
          height:170px;
          margin:auto;
          border-radius:50%;
        }

        .donutChart::after {
          position:absolute;
          inset:31px;
          border-radius:50%;
          background:#ffffff;
          content:"";
        }

        .donutCentre {
          position:absolute;
          inset:0;
          z-index:1;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
          pointer-events:none;
        }

        .donutCentre span {
          color:#78908e;
          font-size:11px;
        }

        .donutCentre strong {
          max-width:105px;
          margin-top:3px;
          color:#102f31;
          font-size:18px;
          line-height:1.2;
        }

        .categoryLegend {
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .categoryLegendRow {
          display:grid;
          grid-template-columns:10px minmax(0,1fr) auto auto;
          align-items:center;
          gap:8px;
          color:#4b6664;
          font-size:12px;
        }

        .categoryDot {
          width:9px;
          height:9px;
          border-radius:50%;
        }

        .categoryAmount {
          color:#233f40;
          font-weight:700;
          text-align:right;
        }

        .categoryPercent {
          width:48px;
          color:#78908e;
          text-align:right;
        }

        .categoryTotal {
          display:flex;
          justify-content:space-between;
          margin-top:4px;
          padding-top:12px;
          border-top:1px solid #e5edeb;
          color:#102f31;
          font-size:13px;
          font-weight:800;
        }

        @media (max-width:1050px) {
          .dashboardCharts {
            grid-template-columns:1fr;
          }
        }

        @media (max-width:620px) {
          .dashboardChartCard {
            padding:14px;
          }

          .categoryChartBody {
            grid-template-columns:1fr;
          }

          .categoryLegendRow {
            grid-template-columns:10px minmax(0,1fr) auto;
          }

          .categoryPercent {
            display:none;
          }
        }
      `}</style>

      <section className="dashboardCharts">
        <article className="dashboardChartCard">
          <div className="dashboardChartHeader">
            <div>
              <h3>Expense Trend</h3>
              <span>
                Daily spending for {monthLabel}
              </span>
            </div>

            <span className="dashboardChartBadge">
              Daily
            </span>
          </div>

          {monthExpenses.length === 0 ? (
            <div className="expenseChartEmpty">
              No expense data available for this month.
            </div>
          ) : (
            <svg
              className="expenseChartSvg"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label={`Expense trend for ${monthLabel}`}
            >
              <defs>
                <linearGradient
                  id="expenseAreaGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#079b83"
                    stopOpacity="0.24"
                  />
                  <stop
                    offset="100%"
                    stopColor="#079b83"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {yGuides.map((guide) => {
                const value =
                  maxDaily * guide;

                const y =
                  yFor(value);

                return (
                  <g key={guide}>
                    <line
                      x1={chartPadding.left}
                      y1={y}
                      x2={chartWidth - chartPadding.right}
                      y2={y}
                      stroke="#e7efed"
                      strokeWidth="1"
                    />

                    <text
                      x={chartPadding.left - 10}
                      y={y + 4}
                      fill="#78908e"
                      fontSize="10"
                      textAnchor="end"
                    >
                      {value >= 1000
                        ? `RM ${(value / 1000).toFixed(1)}k`
                        : `RM ${Math.round(value)}`}
                    </text>
                  </g>
                );
              })}

              <polygon
                points={areaPoints}
                fill="url(#expenseAreaGradient)"
              />

              <polyline
                points={linePoints}
                fill="none"
                stroke="#079b83"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {dailyTotals
                .filter(
                  (item, index) =>
                    item.amount > 0 &&
                    (
                      index % 3 === 0 ||
                      index === dailyTotals.length - 1
                    ),
                )
                .map((item) => {
                  const index =
                    item.day - 1;

                  return (
                    <circle
                      key={item.day}
                      cx={xFor(index)}
                      cy={yFor(item.amount)}
                      r="4"
                      fill="#ffffff"
                      stroke="#079b83"
                      strokeWidth="3"
                    >
                      <title>
                        {`Day ${item.day}: ${moneyLabel(item.amount)}`}
                      </title>
                    </circle>
                  );
                })}

              {[1, 5, 10, 15, 20, 25, daysInMonth]
                .filter(
                  (day, index, values) =>
                    day <= daysInMonth &&
                    values.indexOf(day) === index,
                )
                .map((day) => (
                  <text
                    key={day}
                    x={xFor(day - 1)}
                    y={chartHeight - 10}
                    fill="#78908e"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {day} Jul
                  </text>
                ))}
            </svg>
          )}
        </article>

        <article className="dashboardChartCard">
          <div className="dashboardChartHeader">
            <div>
              <h3>Spending by Category</h3>
              <span>
                Category breakdown for {monthLabel}
              </span>
            </div>

            <span className="dashboardChartBadge">
              This Month
            </span>
          </div>

          <div className="categoryChartBody">
            <div
              className="donutChart"
              style={{
                background:donutBackground,
              }}
            >
              <div className="donutCentre">
                <span>Total</span>
                <strong>
                  {moneyLabel(totalExpense)}
                </strong>
              </div>
            </div>

            <div className="categoryLegend">
              {visibleCategories.length === 0 ? (
                <span>
                  No category data available.
                </span>
              ) : (
                visibleCategories.map(
                  (item, index) => {
                    const percentage =
                      totalExpense > 0
                        ? item.amount / totalExpense * 100
                        : 0;

                    return (
                      <div
                        className="categoryLegendRow"
                        key={`${item.name}-${index}`}
                      >
                        <span
                          className="categoryDot"
                          style={{
                            background:
                              categoryColours[
                                index % categoryColours.length
                              ],
                          }}
                        />

                        <span>
                          {item.name}
                        </span>

                        <span className="categoryAmount">
                          {moneyLabel(item.amount)}
                        </span>

                        <span className="categoryPercent">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  },
                )
              )}

              <div className="categoryTotal">
                <span>Total</span>
                <span>{moneyLabel(totalExpense)}</span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </>
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
