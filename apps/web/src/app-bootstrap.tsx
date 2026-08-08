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
  invite: "imai_pending_invite_token",
  dashboardLanguage: "imai_dashboard_language",
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
;

type WorkspaceType =
  | "PERSONAL"
  | "FAMILY"
  | "BUSINESS";

type WorkspacePackage =
  | WorkspaceType
  | "PERSONAL_PRO";

type DashboardLanguage =
  | "ms"
  | "en";

type AdminUser = {
  userId:string;
  isSuperAdmin?:boolean;
  email:string;
  name:string | null;
  status?:string | null;
  bannedAt?:string | null;
  deactivatedAt?:string | null;
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
  createdById?:string | null;
  createdByEmail?:string | null;
  createdBy?:{
    id?:string | null;
    name?:string | null;
    email?:string | null;
  } | null;
  category?:{ name:string } | null;
  merchant?:{ name:string } | null;
  paymentMethod?:{ name:string } | null;
};

type LoadState = {
  loading:boolean;
  error:string | null;
};

type BillingPlan =
  | "PERSONAL_PRO"
  | "FAMILY"
  | "BUSINESS";


type BillingSubscriptionData = {
  workspace:{
    id:string;
    name:string;
    type:WorkspaceType;
    role:string;
  };

  access:{
    plan:string;
    status:string;
    expiresAt:string | null;
  };

  billing:{
    plan:BillingPlan;
    pendingPlan:BillingPlan | null;
    planChangeRequestedAt:string | null;
    status:string;
    provider:string;
    checkoutUrl:string | null;
    currentPeriodStart:string | null;
    currentPeriodEnd:string | null;
    lastPaymentAt:string | null;
    lastPaymentStatus:string | null;
    canceledAt:string | null;
  } | null;
};


type CommitmentItem = {
  id:string;
  name:string;
  amount:string;
  currency:string;
  dueDay:number;
  reminderDaysBefore:number;
  reminderTime:string;
  timezone:string;
  isActive:boolean;
  archivedAt:string | null;
  canManage:boolean;
  currentMonth:{
    instanceId:string | null;
    dueDate:string;
    status:
      | "PENDING"
      | "PAID"
      | "OVERDUE"
      | "SKIPPED";
    paidAt:string | null;
  };
  nextReminderAt:string;
};

type CommitmentListData = {
  period:{
    year:number;
    month:number;
    label:string;
  };
  filter:string;
  items:CommitmentItem[];
  summary:{
    total:number;
    totalUnpaid:string;
    currency:string;
  };
};

type BotSettingsData = {
  botEnabled:boolean;
  replyLanguage:string;
  timezone:string;
  defaultReminderDaysBefore:number;
  defaultReminderTime:string;
  quietHoursStart:string;
  quietHoursEnd:string;
  overdueReminderEnabled:boolean;
  whatsappNotificationEnabled:boolean;
};

type DashboardData = {
  health:any | null;
  me:any | null;
  billing:BillingSubscriptionData | null;
  google:any | null;
  whatsapp:any | null;
  members:Member[];
  adminUsers:AdminUser[];
  transactions:Transaction[];
  commitments:CommitmentListData | null;
  botSettings:BotSettingsData | null;
};


const BILLING_PLAN_OPTIONS:Array<{
  plan:BillingPlan;
  name:string;
  price:string;
  description:string;
}> = [
  {
    plan:
      "PERSONAL_PRO",

    name:
      "Personal Pro",

    price:
      "RM9 / month",

    description:
      "For one active individual with personal finance, AI, Google Sheets and Google Drive.",
  },

  {
    plan:
      "FAMILY",

    name:
      "Family",

    price:
      "RM19 / month",

    description:
      "Shared family records, multiple members and WhatsApp phone whitelist.",
  },

  {
    plan:
      "BUSINESS",

    name:
      "Business / Company",

    price:
      "RM49 / month",

    description:
      "For owners and employees with roles, company records and complete reporting.",
  },
];


function billingPlanLabel(
  plan:string | null | undefined,
){

  if(plan === "PERSONAL_PRO"){
    return "Personal Pro";
  }


  if(plan === "FAMILY"){
    return "Family";
  }


  if(plan === "BUSINESS"){
    return "Business / Company";
  }


  if(plan === "FREE"){
    return "Free";
  }


  return "Personal";

}


function billingStatusLabel(
  status:string | null | undefined,
){

  if(status === "CHECKOUT_PENDING"){
    return "Payment pending";
  }


  if(status === "SCHEDULED"){
    return "Scheduled";
  }


  if(status === "RETRYING"){
    return "Payment retrying";
  }


  if(status === "PAUSED"){
    return "Paused";
  }


  if(status === "CANCELED"){
    return "Canceled";
  }


  if(status === "EXPIRED"){
    return "Expired";
  }


  if(status === "INACTIVE"){
    return "Inactive";
  }


  return "Active";

}

type DashboardView =
  | "dashboard"
  | "transactions"
  | "whatsapp"
  | "google"
  | "commitments"
  | "bot-settings"
  | "admin"
  | "settings"
  | "super-admin";

type TransactionFilterMode =
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "YEAR"
  | "ALL"
  | "CUSTOM";


type TransactionFilterRange = {
  start:Date | null;
  end:Date | null;
};


function transactionDateInputValue(
  date:Date,
){

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );


  return `${year}-${month}-${day}`;

}


function parseTransactionDateInput(
  value:string,
){

  if(
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ){

    return null;

  }


  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);


  const date =
    new Date(
      year,
      month - 1,
      day,
    );


  if(
    date.getFullYear() !== year
    ||
    date.getMonth() !== month - 1
    ||
    date.getDate() !== day
  ){

    return null;

  }


  return date;

}


function resolveTransactionFilterRange(
  mode:TransactionFilterMode,
  customFrom:string,
  customTo:string,
  referenceDate:Date = new Date(),
):TransactionFilterRange {

  const today =
    new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );


  if(mode === "ALL"){

    return {
      start:null,
      end:null,
    };

  }


  if(mode === "TODAY"){

    return {
      start:
        today,

      end:
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        ),
    };

  }


  if(mode === "WEEK"){

    const mondayOffset =
      (
        today.getDay()
        +
        6
      )
      %
      7;

    const start =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - mondayOffset,
      );


    return {
      start,

      end:
        new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + 7,
        ),
    };

  }


  if(mode === "MONTH"){

    return {
      start:
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ),

      end:
        new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1,
        ),
    };

  }


  if(mode === "YEAR"){

    return {
      start:
        new Date(
          today.getFullYear(),
          0,
          1,
        ),

      end:
        new Date(
          today.getFullYear() + 1,
          0,
          1,
        ),
    };

  }


  let from =
    parseTransactionDateInput(
      customFrom,
    );

  let to =
    parseTransactionDateInput(
      customTo,
    );


  if(
    from
    &&
    to
    &&
    from.getTime() > to.getTime()
  ){

    const temporary =
      from;

    from =
      to;

    to =
      temporary;

  }


  return {
    start:
      from,

    end:
      to
        ? new Date(
          to.getFullYear(),
          to.getMonth(),
          to.getDate() + 1,
        )
        : null,
  };

}


function normalizeDashboardLanguage(
  value:string | null | undefined,
):DashboardLanguage{

  return value === "ms"
    ? "ms"
    : "en";

}


const DASHBOARD_TEXT = {
  en:{
    navDashboard:"Dashboard",
    navTransactions:"Transactions",
    navCommitments:"Commitments",
    navWhatsApp:"WhatsApp",
    navGoogleSheet:"Google Sheet",
    navAdmin:"Admin",
    navBotSettings:"Bot Settings",
    navSettings:"Settings",
    apiHealthy:"● API Healthy",
    install:"Install",
    setup:"Setup",
    logout:"Logout",
    managePlan:"Manage plan",
    dashboardLanguage:"Dashboard language",
    dashboardLanguageHelp:"Controls dashboard labels on this device. WhatsApp reply language remains in Bot Settings.",
    languageSaved:"Dashboard language changed to English.",
    transactions:"Transactions",
    recentTransactions:"Recent Transactions",
    transactionPeriod:"Transaction period",
    record:"record",
    records:"records",
    date:"Date",
    type:"Type",
    category:"Category",
    merchant:"Merchant",
    amount:"Amount",
    source:"Source",
    recordedBy:"Recorded by",
    addTransaction:"Add Transaction",
    refreshTransactions:"Refresh transactions",
    commitments:"Commitments & Reminders",
    unpaid:"Unpaid",
    paid:"Paid",
    overdue:"Overdue",
    all:"All",
    inactive:"Inactive",
    refresh:"Refresh",
    currentMonth:"Current month",
    totalUnpaid:"Total unpaid",
    commitmentName:"Commitment name",
    commitmentAmount:"Amount RM",
    paymentDay:"Payment day",
    earlyReminder:"Early reminder",
    time:"Time",
    addCommitment:"Add commitment",
    due:"due",
    nextReminder:"Next reminder",
    markPaid:"Mark paid",
    deactivate:"Deactivate",
    activate:"Activate",
    archive:"Archive",
    botEnabled:"Bot enabled",
    replyLanguage:"Reply language",
    timezone:"Timezone",
    defaultReminderDaysBefore:"Default reminder days before",
    defaultReminderTime:"Default reminder time",
    quietHoursStart:"Quiet hours start",
    quietHoursEnd:"Quiet hours end",
    saveBotSettings:"Save bot settings",
    botSettingsHelp:"Reply language controls WhatsApp reminder and bot help replies. If the bot is disabled, scheduled reminders are not sent. Dashboard can still be used.",
    workspace:"Workspace",
    workspaceType:"Workspace type",
    yourRole:"Your role",
    api:"API",
    healthy:"Healthy",
    checking:"Checking",
    connected:"Connected",
    notConnected:"Not connected",
    dashboardActions:"Dashboard actions",
    installApp:"Install app",
    openSetupWizard:"Open setup wizard",
    refreshDashboard:"Refresh dashboard",
    today:"Today",
    thisWeek:"This Week",
    thisMonth:"This Month",
    thisYear:"This Year",
    allTime:"All Time",
    customRange:"Custom Range",
    from:"From",
    until:"Until",
    to:"to",
  },
  ms:{
    navDashboard:"Papan Pemuka",
    navTransactions:"Transaksi",
    navCommitments:"Komitmen",
    navWhatsApp:"WhatsApp",
    navGoogleSheet:"Google Sheet",
    navAdmin:"Admin",
    navBotSettings:"Tetapan Bot",
    navSettings:"Tetapan",
    apiHealthy:"● API Sihat",
    install:"Pasang",
    setup:"Setup",
    logout:"Log keluar",
    managePlan:"Urus plan",
    dashboardLanguage:"Bahasa dashboard",
    dashboardLanguageHelp:"Mengawal label dashboard pada device ini. Bahasa reply WhatsApp kekal di Tetapan Bot.",
    languageSaved:"Bahasa dashboard ditukar kepada Bahasa Melayu.",
    transactions:"Transaksi",
    recentTransactions:"Transaksi Terkini",
    transactionPeriod:"Tempoh transaksi",
    record:"rekod",
    records:"rekod",
    date:"Tarikh",
    type:"Jenis",
    category:"Kategori",
    merchant:"Merchant",
    amount:"Jumlah",
    source:"Sumber",
    recordedBy:"Direkod oleh",
    addTransaction:"Tambah Transaksi",
    refreshTransactions:"Refresh transaksi",
    commitments:"Komitmen & Reminder",
    unpaid:"Belum dibayar",
    paid:"Sudah dibayar",
    overdue:"Lewat",
    all:"Semua",
    inactive:"Tidak aktif",
    refresh:"Refresh",
    currentMonth:"Bulan semasa",
    totalUnpaid:"Jumlah belum dibayar",
    commitmentName:"Nama komitmen",
    commitmentAmount:"Jumlah RM",
    paymentDay:"Hari bayaran",
    earlyReminder:"Reminder awal",
    time:"Waktu",
    addCommitment:"Tambah komitmen",
    due:"tarikh bayar",
    nextReminder:"Reminder seterusnya",
    markPaid:"Tanda dibayar",
    deactivate:"Nyahaktifkan",
    activate:"Aktifkan",
    archive:"Arkib",
    botEnabled:"Bot aktif",
    replyLanguage:"Bahasa reply",
    timezone:"Zon masa",
    defaultReminderDaysBefore:"Default hari reminder awal",
    defaultReminderTime:"Default waktu reminder",
    quietHoursStart:"Waktu senyap mula",
    quietHoursEnd:"Waktu senyap tamat",
    saveBotSettings:"Simpan tetapan bot",
    botSettingsHelp:"Bahasa reply mengawal WhatsApp reminder dan bantuan bot. Jika bot disabled, scheduled reminder tidak akan dihantar. Dashboard masih boleh digunakan.",
    workspace:"Workspace",
    workspaceType:"Jenis workspace",
    yourRole:"Role anda",
    api:"API",
    healthy:"Sihat",
    checking:"Menyemak",
    connected:"Connected",
    notConnected:"Belum connected",
    dashboardActions:"Tindakan dashboard",
    installApp:"Pasang app",
    openSetupWizard:"Buka setup wizard",
    refreshDashboard:"Refresh dashboard",
    today:"Hari Ini",
    thisWeek:"Minggu Ini",
    thisMonth:"Bulan Ini",
    thisYear:"Tahun Ini",
    allTime:"Sepanjang Masa",
    customRange:"Julat Tersuai",
    from:"Dari",
    until:"Sehingga",
    to:"hingga",
  },
} as const;


function transactionFilterDisplayLabel(
  mode:TransactionFilterMode,
  range:TransactionFilterRange,
  language:DashboardLanguage = "en",
){

  const text =
    DASHBOARD_TEXT[language];

  const labels:
    Record<string, string> =
    {
      TODAY:
        text.today,

      WEEK:
        text.thisWeek,

      MONTH:
        text.thisMonth,

      YEAR:
        text.thisYear,

      ALL:
        text.allTime,
    };


  if(mode !== "CUSTOM"){

    return labels[mode]
    ||
    text.transactions;

  }


  const displayDate =
    (
      date:Date | null,
    ) =>
      date
        ? date.toLocaleDateString(
          language === "ms" ? "ms-MY" : "en-MY",
          {
            day:
              "numeric",

            month:
              "short",

            year:
              "numeric",
          },
        )
        : "";


  const startLabel =
    displayDate(
      range.start,
    );

  const inclusiveEnd =
    range.end
      ? new Date(
        range.end.getFullYear(),
        range.end.getMonth(),
        range.end.getDate() - 1,
      )
      : null;

  const endLabel =
    displayDate(
      inclusiveEnd,
    );


  if(
    startLabel
    &&
    endLabel
  ){

    return `${startLabel} – ${endLabel}`;

  }


  if(startLabel){

    return `${text.from} ${startLabel}`;

  }


  if(endLabel){

    return `${text.until} ${endLabel}`;

  }


  return text.customRange;

}


function transactionMatchesFilter(
  transaction:Transaction,
  range:TransactionFilterRange,
){

  const timestamp =
    new Date(
      transaction.transactionDate,
    ).getTime();


  if(
    !Number.isFinite(
      timestamp,
    )
  ){

    return false;

  }


  if(
    range.start
    &&
    timestamp < range.start.getTime()
  ){

    return false;

  }


  if(
    range.end
    &&
    timestamp >= range.end.getTime()
  ){

    return false;

  }


  return true;

}



const DASHBOARD_VIEWS:DashboardView[] =
  [
    "dashboard",
    "transactions",
    "whatsapp",
    "google",
    "commitments",
    "bot-settings",
    "admin",
    "settings",
  ];

function readDashboardViewFromHash():DashboardView{

  if(typeof window === "undefined"){
    return "dashboard";
  }

  const hash =
    window.location.hash.replace("#", "");

  return DASHBOARD_VIEWS.includes(hash as DashboardView)
    ? hash as DashboardView
    : "dashboard";

}

function writeDashboardViewHash(view:DashboardView){

  if(
    typeof window !== "undefined"
    &&
    window.location.hash !== `#${view}`
  ){
    window.history.replaceState(null, "", `#${view}`);
  }

}


function readInitialDashboardView():DashboardView{
  if(typeof window === "undefined"){
    return "dashboard";
  }

  const hash =
    window.location.hash
      .replace(/^#/, "")
      .trim();

  if(
    hash === "dashboard"
    ||
    hash === "transactions"
    ||
    hash === "whatsapp"
    ||
    hash === "google"
    ||
    hash === "commitments"
    ||
    hash === "bot-settings"
    ||
    hash === "admin"
    ||
    hash === "settings"
  ){
    return hash;
  }

  return "dashboard";
}

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
      billing:null,
      google:null,
      whatsapp:null,
      members:[],
      adminUsers:[],
      transactions:[],
      commitments:null,
      botSettings:null,
    });

  const [notice, setNotice] =
    useState("");

  const [preferredWizardStep, setPreferredWizardStep] =
    useState(
      stored(STORAGE.wizardStep),
    );

  const [pendingInviteToken, setPendingInviteToken] =
    useState(
      stored(STORAGE.invite),
    );

  const [acceptingInvite, setAcceptingInvite] =
    useState(false);

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

    // accept pending invite after login
    const inviteToken =
      pendingInviteToken
      ||
      stored(STORAGE.invite);

    if(!token || !inviteToken){
      return;
    }

    let cancelled =
      false;

    async function acceptInvite(){

      try{

        setAcceptingInvite(true);

        const inviteResult =
          await api<{
            token?:string;
            workspaceId?:string;
            role?:string;
          }>(
            "/workspace/invites/accept",
            token,
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  token:
                    inviteToken,
                }),
            },
          );

        const nextToken =
          inviteResult.token
          ||
          token;

        if(cancelled){
          return;
        }

        localStorage.removeItem(
          STORAGE.invite,
        );

        setPendingInviteToken("");

        localStorage.removeItem(
          STORAGE.wizardStep,
        );

        setPreferredWizardStep("");

        setNotice(
          "Invite accepted. Welcome to your shared workspace.",
        );

        window.history.replaceState(
          null,
          document.title,
          "/#dashboard",
        );

        if(inviteResult.token){
          localStorage.setItem(
            STORAGE.token,
            nextToken,
          );

          setToken(
            nextToken,
          );
        }

        window.location.replace(
          "/#dashboard",
        );

        return;

      }catch(error){

        if(!cancelled){
          setNotice(
            error instanceof Error
              ? error.message
              : "Invite accept failed.",
          );
        }

      }finally{

        if(!cancelled){
          setAcceptingInvite(false);
        }

      }

    }

    acceptInvite();

    return () => {
      cancelled =
        true;
    };

  }, [
    token,
    pendingInviteToken,
  ]);


  useEffect(() => {

    // store invite token from path before Google redirects away
    const inviteMatch =
      window.location.pathname.match(/^\/invite\/([^/]+)/);

    if(inviteMatch?.[1]){
      localStorage.setItem(
        STORAGE.invite,
        inviteMatch[1],
      );

      setPendingInviteToken(
        inviteMatch[1],
      );
    }

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

      if(!stored(STORAGE.invite)){
        localStorage.setItem(
          STORAGE.token,
          authToken,
        );
      }

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

      if(isGoogleLogin && !stored(STORAGE.invite)){
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
  ):Promise<boolean>{

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

        return true;

      }

      const [
        me,
        billing,
        googleSettingsResult,
        whatsapp,
        members,
        sheetTransactionsResult,
        commitments,
        botSettings,
      ] =
        await Promise.all([
          api<any>("/auth/me", activeToken),
          optionalApi<BillingSubscriptionData | null>(
            "/billing/subscription",
            activeToken,
            null,
          ),
          api<any | null>(
            "/google/settings",
            activeToken,
          )
            .then(
              (value) => ({
                ok:true as const,
                value,
              }),
            )
            .catch(
              (error:unknown) => ({
                ok:false as const,
                error,
              }),
            ),
          optionalApi<any | null>("/whatsapp/status", activeToken, null),
          optionalApi<Member[]>("/whatsapp/members", activeToken, []),
          api<any>(
            "/transactions/sheet",
            activeToken,
          )
            .then(
              (value) => ({
                ok:true as const,
                value,
              }),
            )
            .catch(
              (error:unknown) => ({
                ok:false as const,
                error,
              }),
            ),
          optionalApi<CommitmentListData | null>("/commitments?status=unpaid", activeToken, null),
          optionalApi<BotSettingsData | null>("/bot-settings", activeToken, null),
        ]);

      if(
        !googleSettingsResult.ok
      ){

        throw googleSettingsResult.error;

      }


      const google =
        googleSettingsResult.value;


      let resolvedTransactions:any;


      if(
        sheetTransactionsResult.ok
      ){

        resolvedTransactions =
          sheetTransactionsResult.value;

      }else if(
        !google?.spreadsheetId
      ){

        resolvedTransactions =
          await optionalApi<any>(
            "/transactions?limit=12",
            activeToken,
            [],
          );

      }else{

        throw sheetTransactionsResult.error;

      }


      const adminUsers =
        me?.isSuperAdmin          ? await api<AdminUser[]>(
            "/workspace/admin/users",
            activeToken,
          )
          : [];

      setData({
        health,
        me,
        billing,
        google,
        whatsapp,
        members:
          listFrom<Member>(members),
        adminUsers:
          listFrom<AdminUser>(adminUsers),
        transactions:
          listFrom<Transaction>(resolvedTransactions),
        commitments,
        botSettings,
      });

      setState({
        loading:false,
        error:null,
      });

      return true;

    }catch(error){

      setState({
        loading:false,
        error:
          error instanceof Error
            ? error.message
            : "Dashboard request failed",
      });

      return false;

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

      const response =
        await fetch(
          `${API_BASE}/google/oauth/url`,
          {
            headers:{
              Authorization:
                `Bearer ${token}`,
            },
          },
        );


      const result =
        await response.json();


      if(!result.url){

        throw new Error(
          result.message
          ||
          "Google OAuth URL failed",
        );

      }


      window.location.href =
        result.url;

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

    const currentTemplate =
      data.google?.templateType ||
      "";

    const actionLabel =
      currentTemplate &&
      currentTemplate !== templateType
        ?
        `Upgrade Google Sheet daripada ${currentTemplate} kepada ${templateType}`
        :
        `Recreate Google Sheet ${templateType}`;

    const confirmed =
      window.confirm(
        `${actionLabel} akan hasilkan sheet baru dalam Google Drive anda. Sheet lama tidak dipadam dan boleh dijadikan archive. Teruskan?`,
      );


    if(!confirmed){

      return;

    }


    try{

      setNotice(
        currentTemplate &&
        currentTemplate !== templateType
          ?
          `Sedang upgrade Google Sheet kepada ${templateType}...`
          :
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
        currentTemplate &&
        currentTemplate !== templateType
          ?
          `Google Sheet ${templateType} baru telah dibuat dan disambungkan kepada workspace.`
          :
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


  async function updateGoogleSheetTemplate(){

    const currentVersion =
      data.google?.currentTemplateVersion
      ||
      "-";

    const latestVersion =
      data.google?.latestTemplateVersion
      ||
      "-";

    if(!data.google?.templateUpdateAvailable){

      setNotice(
        "Google Sheet sudah menggunakan template terkini.",
      );

      return;

    }

    if(!data.google?.templateUpdateSupported){

      setNotice(
        data.google?.templateUpdateMessage
        ||
        "Template baharu memerlukan migration tambahan sebelum boleh digunakan.",
      );

      return;

    }

    const confirmed =
      window.confirm(
        `Update Google Sheet daripada Version ${currentVersion} kepada ${latestVersion}? Backup penuh akan dibuat dahulu dan rekod transaksi tidak akan dipadam.`,
      );

    if(!confirmed){
      return;
    }

    try{

      setNotice(
        `Sedang backup dan update Google Sheet kepada Version ${latestVersion}...`,
      );

      const result =
        await api<any>(
          "/google/settings/template-update",
          token,
          {
            method:
              "POST",

            body:
              JSON.stringify({}),
          },
        );

      setNotice(
        result.updated
          ? `Google Sheet berjaya dikemas kini kepada Version ${result.currentTemplateVersion}. ${result.preservedTransactions} transaksi dikekalkan.`
          : result.message
            ||
            "Google Sheet sudah menggunakan template terkini.",
      );

      await loadAll();

    }catch(error){

      setNotice(
        error instanceof Error
          ? error.message
          : "Google Sheet template update failed.",
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
    data.me?.workspace?.role !== "MEMBER"
    &&
    !acceptingInvite
    &&
    !pendingInviteToken
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
    (
      state.loading
      ||
      acceptingInvite
    )
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
      updateGoogleSheetTemplate={updateGoogleSheetTemplate}
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
            <div
              className="notice"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {props.notice}
            </div>
          )}

          {current === "Welcome" && (
            <WizardCard
              title="Selamat datang ke MyPocket AI"
              text="Mulakan dengan 3 perkara penting: sambung Google Sheet, pair WhatsApp bot jika digunakan, kemudian rekod transaksi pertama supaya dashboard mula hidup."
            >
              <Checklist
                items={[
                  "Sambung Google Sheet sebagai tempat data kewangan anda",
                  "Pair WhatsApp bot untuk rekod expense dan income dari chat",
                  "Semak workspace dan akses ahli sebelum mula digunakan",
                  "Install PWA supaya dashboard mudah dibuka di phone",
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
              text="Pastikan Google Sheet sudah connected. Jika belum, sambung dahulu supaya transaksi dan workspace boleh sync dengan betul."
            >
              <StatusGrid
                rows={[
                  ["Status", props.data.google?.spreadsheetId ? "Connected" : "Not connected"],
                  ["Template", props.data.google?.templateType || "PERSONAL"],
                  ["Spreadsheet", props.data.google?.spreadsheetTitle || "-"],
                  ["Next action", props.data.google?.spreadsheetId ? "Review dashboard or record first transaction" : "Connect Google Sheet before continuing"],
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
                {props.data.members.length === 0 && (
                  <div
                    className="hint"
                    role="status"
                    aria-live="polite"
                  >
                    Tiada ahli lagi / No members have been added yet.
                  </div>
                )}

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

                  {
                    done:
                      setupReady,

                    text:
                      setupReady
                        ? "Ready to record first transaction"
                        : "Complete setup before first transaction",
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
            <div
              className="errorBox"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {props.state.error}
            </div>
          )}
        </div>
      </section>
    </main>
  );

}

function TransactionFilterControls(
  props:{
    mode:TransactionFilterMode;
    label:string;
    customFrom:string;
    customTo:string;
    transactionCount:number;
    language:DashboardLanguage;
    onModeChange:(mode:TransactionFilterMode) => void;
    onCustomFromChange:(value:string) => void;
    onCustomToChange:(value:string) => void;
  },
){

  const text =
    DASHBOARD_TEXT[props.language];

  const controlStyle:React.CSSProperties =
    {
      border:
        "1px solid #cbdedb",

      borderRadius:
        8,

      background:
        "#ffffff",

      color:
        "#193c3c",

      padding:
        "9px 11px",

      font:
        "inherit",
    };


  return (
    <div
      style={{
        display:
          "flex",

        flexWrap:
          "wrap",

        justifyContent:
          "space-between",

        alignItems:
          "center",

        gap:
          12,

        marginBottom:
          16,

        padding:
          14,

        border:
          "1px solid #d7e4e2",

        borderRadius:
          12,

        background:
          "#f7fbfa",
      }}
    >
      <div
        style={{
          display:
            "grid",

          gap:
            3,
        }}
      >
        <strong>
          {text.transactionPeriod}
        </strong>

        <span
          style={{
            color:
              "#68807d",

            fontSize:
              12,
          }}
        >
          {props.label} · {props.transactionCount} {props.transactionCount === 1 ? text.record : text.records}
        </span>
      </div>

      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          alignItems:
            "center",

          gap:
            8,
        }}
      >
        <select
          value={props.mode}
          aria-label="Transaction period"
          style={controlStyle}
          onChange={(event) =>
            props.onModeChange(
              event.target.value as TransactionFilterMode,
            )
          }
        >
          <option value="TODAY">
            {text.today}
          </option>

          <option value="WEEK">
            {text.thisWeek}
          </option>

          <option value="MONTH">
            {text.thisMonth}
          </option>

          <option value="YEAR">
            {text.thisYear}
          </option>

          <option value="ALL">
            {text.allTime}
          </option>

          <option value="CUSTOM">
            {text.customRange}
          </option>
        </select>

        {props.mode === "CUSTOM" && (
          <>
            <input
              type="date"
              value={props.customFrom}
              aria-label="Transaction date from"
              style={controlStyle}
              onChange={(event) =>
                props.onCustomFromChange(
                  event.target.value,
                )
              }
            />

            <span
              style={{
                color:
                  "#68807d",

                fontSize:
                  12,
              }}
            >
              {text.to}
            </span>

            <input
              type="date"
              value={props.customTo}
              aria-label="Transaction date to"
              style={controlStyle}
              onChange={(event) =>
                props.onCustomToChange(
                  event.target.value,
                )
              }
            />
          </>
        )}
      </div>
    </div>
  );

}



function Dashboard(
  props:{
    data:DashboardData;
    state:LoadState;
    notice:string;
    refresh:() => Promise<boolean>;
    resetWizard:() => void;
    installApp:() => void;
    connectGoogleSheet:() => void;
    recreateGoogleSheet:() => void;
    updateGoogleSheetTemplate:() => void;
    openWhatsAppQr:(mode?:WhatsAppQrMode) => void;
    resetWhatsAppInstance:(mode?:WhatsAppQrMode) => void;
    whatsAppQr:WhatsAppQrState;
    qrSecondsLeft:number;
    closeWhatsAppQr:() => void;
    signOut:() => void;
  },
){

  const [activeView, setActiveView] =
    useState<DashboardView>(readDashboardViewFromHash);

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [actionMessage, setActionMessage] =
    useState("");

  const [dashboardLanguage, setDashboardLanguage] =
    useState<DashboardLanguage>(() =>
      normalizeDashboardLanguage(
        localStorage.getItem(
          STORAGE.dashboardLanguage,
        ),
      )
    );

  const dashboardText =
    DASHBOARD_TEXT[dashboardLanguage];

  const [billingOpen, setBillingOpen] =
    useState(false);

  const [billingBusyPlan, setBillingBusyPlan] =
    useState<BillingPlan | null>(
      null,
    );

  const [billingError, setBillingError] =
    useState("");

  const [linkEmail, setLinkEmail] =
    useState("");

  const [linkPhone, setLinkPhone] =
    useState("");

  const [inviteUrl, setInviteUrl] =
    useState("");

  const [newMemberEmail, setNewMemberEmail] =
    useState("");

  const [newMemberRole, setNewMemberRole] =
    useState<MemberRole>("MEMBER");

  const [pendingMemberRoles, setPendingMemberRoles] =
    useState<Record<string, MemberRole>>({});

  const [packageBusyUserId, setPackageBusyUserId] =
    useState("");

  const [workspaceName, setWorkspaceName] =
    useState(
      props.data.me?.workspace?.name
      ||
      "",
    );

  const [workspaceNameBusy, setWorkspaceNameBusy] =
    useState(false);

  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilterMode>(
      "MONTH",
    );

  const [selectedTransactionIds, setSelectedTransactionIds] =
    useState<string[]>(
      [],
    );

  const [bulkDeleteBusy, setBulkDeleteBusy] =
    useState(
      false,
    );

  const [transactionCustomFrom, setTransactionCustomFrom] =
    useState(
      () => {

        const current =
          new Date();

        return transactionDateInputValue(
          new Date(
            current.getFullYear(),
            current.getMonth(),
            1,
          ),
        );

      },
    );

  const [transactionCustomTo, setTransactionCustomTo] =
    useState(
      () =>
        transactionDateInputValue(
          new Date(),
        ),
    );

  const [commitmentName, setCommitmentName] =
    useState("");

  const [commitmentAmount, setCommitmentAmount] =
    useState("");

  const [commitmentDueDay, setCommitmentDueDay] =
    useState("10");

  const [commitmentReminderDays, setCommitmentReminderDays] =
    useState("2");

  const [commitmentReminderTime, setCommitmentReminderTime] =
    useState("09:00");

  const [commitmentFilter, setCommitmentFilter] =
    useState("unpaid");

  const [commitmentsViewData, setCommitmentsViewData] =
    useState<CommitmentListData | null>(
      props.data.commitments,
    );

  const [botEnabled, setBotEnabled] =
    useState(true);

  const [botReplyLanguage, setBotReplyLanguage] =
    useState("ms");

  const [botTimezone, setBotTimezone] =
    useState("Asia/Kuala_Lumpur");

  const [botReminderDays, setBotReminderDays] =
    useState("2");

  const [botReminderTime, setBotReminderTime] =
    useState("09:00");

  const [botQuietStart, setBotQuietStart] =
    useState("22:00");

  const [botQuietEnd, setBotQuietEnd] =
    useState("08:00");

  const actorRole =
    (
      props.data.me?.workspace?.role ||
      "MEMBER"
    ) as MemberRole;

  const currentAccessPlan =
    props.data.billing?.access?.plan
    ||
    props.data.me?.subscriptionPlan
    ||
    props.data.me?.package
    ||
    "PERSONAL";

  const currentBillingPlan =
    props.data.billing?.billing?.plan
    ??
    null;

  const pendingBillingPlan =
    props.data.billing?.billing?.pendingPlan
    ??
    null;

  const currentBillingStatus =
    props.data.billing?.billing?.status
    ||
    props.data.billing?.access?.status
    ||
    props.data.me?.subscriptionStatus
    ||
    "ACTIVE";

  const canManageBilling =
    actorRole === "OWNER";

  const canBulkDeleteTransactions =
    actorRole === "OWNER"
    ||
    actorRole === "ADMIN";

  const isSuperAdmin =
    Boolean(
      props.data.me?.isSuperAdmin,
    );

  const workspaceType =
    props.data.me?.workspace?.type ||
    props.data.google?.templateType ||
    "PERSONAL";

  const isSharedWorkspace =
    workspaceType === "FAMILY" ||
    workspaceType === "BUSINESS";

  const canChangeWorkspaceSettings =
    actorRole === "OWNER" ||
    actorRole === "ADMIN";

  const canViewWorkspaceSettings =
    canChangeWorkspaceSettings;

  const canManageMembers =
    isSuperAdmin ||
    (
      isSharedWorkspace
      &&
      canChangeWorkspaceSettings
    );

  const canUseAdmin =
    canManageMembers;

  useEffect(
    () => {
      setCommitmentsViewData(
        props.data.commitments,
      );
    },
    [props.data.commitments],
  );


  useEffect(
    () => {
      if(!props.data.botSettings){
        return;
      }

      setBotEnabled(props.data.botSettings.botEnabled);
      setBotReplyLanguage(props.data.botSettings.replyLanguage || "ms");
      setBotTimezone(props.data.botSettings.timezone);
      setBotReminderDays(String(props.data.botSettings.defaultReminderDaysBefore));
      setBotReminderTime(props.data.botSettings.defaultReminderTime);
      setBotQuietStart(props.data.botSettings.quietHoursStart);
      setBotQuietEnd(props.data.botSettings.quietHoursEnd);
    },
    [props.data.botSettings],
  );


  useEffect(
    () => {

      if(!billingOpen){
        return;
      }


      const handleKeyDown =
        (
          event:KeyboardEvent,
        ) => {

          if(event.key === "Escape"){
            setBillingOpen(false);
          }

        };


      window.addEventListener(
        "keydown",
        handleKeyDown,
      );


      return () =>
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );

    },
    [
      billingOpen,
    ],
  );


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


  const legacyGoogleStorageData =
    props.data.google as any;

  const legacyManualDefaultRootFolderUrl =
    typeof legacyGoogleStorageData?.rootFolderUrl === "string"
      ? legacyGoogleStorageData.rootFolderUrl
      : "";

  const [legacyManualRootFolderUrl, setLegacyManualRootFolderUrl] =
    useState(
      legacyManualDefaultRootFolderUrl,
    );

  const [legacyManualWorkingSheetUrl, setLegacyManualWorkingSheetUrl] =
    useState(
      googleSheetUrl || "",
    );

  const [legacyManualBackupSheetUrl, setLegacyManualBackupSheetUrl] =
    useState(
      backupGoogleSheetUrl || "",
    );

  const [legacyManualGoogleBusy, setLegacyManualGoogleBusy] =
    useState<null | "validate" | "save" | "install">(
      null,
    );

  const [legacyManualGoogleValidation, setLegacyManualGoogleValidation] =
    useState<any | null>(
      null,
    );

  const [legacyManualGoogleMessage, setLegacyManualGoogleMessage] =
    useState("");


  const [legacyManualStorageMode, setLegacyManualStorageMode] =
    useState<"auto" | "manual">(
      "manual",
    );

  const [legacyDrivePickerTarget, setLegacyDrivePickerTarget] =
    useState<null | "folder" | "working" | "backup">(
      null,
    );

  const [legacyDrivePickerQuery, setLegacyDrivePickerQuery] =
    useState("");

  const [legacyDrivePickerItems, setLegacyDrivePickerItems] =
    useState<any[]>(
      [],
    );

  const [legacyDrivePickerBusy, setLegacyDrivePickerBusy] =
    useState(false);

  const [legacyDrivePickerMessage, setLegacyDrivePickerMessage] =
    useState("");


  useEffect(
    () => {
      setLegacyManualRootFolderUrl(
        legacyManualDefaultRootFolderUrl,
      );

      setLegacyManualWorkingSheetUrl(
        googleSheetUrl || "",
      );

      setLegacyManualBackupSheetUrl(
        backupGoogleSheetUrl || "",
      );

      setLegacyManualGoogleValidation(
        null,
      );

      setLegacyManualGoogleMessage(
        "",
      );
    },
    [
      legacyManualDefaultRootFolderUrl,
      googleSheetUrl,
      backupGoogleSheetUrl,
    ],
  );

  function clearLegacyManualGoogleValidation(){
    setLegacyManualGoogleValidation(
      null,
    );

    setLegacyManualGoogleMessage(
      "",
    );
  }

  function legacyManualGooglePayload(){
    const backup =
      legacyManualBackupSheetUrl
        .trim();

    return {
      rootFolderUrl:
        legacyManualRootFolderUrl
          .trim(),

      spreadsheetUrl:
        legacyManualWorkingSheetUrl
          .trim(),

      ...(backup
        ? {
            backupSpreadsheetUrl:
              backup,
          }
        : {}),
    };
  }

  async function legacyManualGoogleRequest(
    path:string,
    body:unknown,
  ):Promise<any>{

    const token =
      localStorage.getItem(
        STORAGE.token,
      );

    if(!token){
      throw new Error(
        dashboardLanguage === "ms"
          ? "Sesi login tidak dijumpai. Sila login semula."
          : "Login session was not found. Please sign in again.",
      );
    }

    const apiBase =
      import.meta.env
        .VITE_API_BASE_URL
      ||
      "https://api.imai.my/api/v1";

    const response =
      await fetch(
        `${apiBase}${path}`,
        {
          method:
            "POST",

          headers:{
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              body,
            ),
        },
      );

    let result:any =
      null;

    try{
      result =
        await response.json();
    }catch{
      result =
        null;
    }

    if(!response.ok){
      throw new Error(
        result?.message
        ||
        (
          dashboardLanguage === "ms"
            ? "Tetapan Google gagal diproses."
            : "Google settings could not be processed."
        ),
      );
    }

    return result;
  }

  function legacyDrivePickerKind(
    target:null | "folder" | "working" | "backup",
  ){
    return target === "folder"
      ? "folder"
      : "spreadsheet";
  }

  function legacyDrivePickerTitle(){
    if(legacyDrivePickerTarget === "folder"){
      return "Select Google Drive Folder";
    }

    if(legacyDrivePickerTarget === "backup"){
      return "Select Backup Google Sheet";
    }

    return "Select Working Google Sheet";
  }

  async function legacyLoadDrivePickerItems(
    target:
      null | "folder" | "working" | "backup" =
        legacyDrivePickerTarget,
    query:string =
      legacyDrivePickerQuery,
  ){
    if(!target){
      return;
    }

    setLegacyDrivePickerBusy(
      true,
    );

    setLegacyDrivePickerMessage(
      "",
    );

    try{
      const result =
        await legacyManualGoogleRequest(
          "/google/settings/manual/picker/list",
          {
            kind:
              legacyDrivePickerKind(
                target,
              ),

            query:
              query.trim(),
          },
        );

      setLegacyDrivePickerItems(
        Array.isArray(
          result?.items,
        )
          ? result.items
          : [],
      );

      if(
        Array.isArray(
          result?.items,
        )
        &&
        result.items.length === 0
      ){
        setLegacyDrivePickerMessage(
          "No matching Google Drive item found.",
        );
      }
    }catch(error){
      setLegacyDrivePickerItems(
        [],
      );

      setLegacyDrivePickerMessage(
        error instanceof Error
          ? error.message
          : "Google Drive list could not be loaded.",
      );
    }finally{
      setLegacyDrivePickerBusy(
        false,
      );
    }
  }

  async function legacyOpenDrivePicker(
    target:"folder" | "working" | "backup",
  ){
    setLegacyManualStorageMode(
      "manual",
    );

    setLegacyDrivePickerTarget(
      target,
    );

    setLegacyDrivePickerQuery(
      "",
    );

    setLegacyDrivePickerItems(
      [],
    );

    setLegacyDrivePickerMessage(
      "",
    );

    await legacyLoadDrivePickerItems(
      target,
      "",
    );
  }

  function legacyCloseDrivePicker(){
    setLegacyDrivePickerTarget(
      null,
    );

    setLegacyDrivePickerMessage(
      "",
    );
  }

  function legacySelectDrivePickerItem(
    item:any,
  ){
    const url =
      typeof item?.url === "string"
        ? item.url
        : "";

    if(!url){
      setLegacyDrivePickerMessage(
        "Selected item does not have a usable Google URL.",
      );

      return;
    }

    if(legacyDrivePickerTarget === "folder"){
      setLegacyManualRootFolderUrl(
        url,
      );
    }else if(legacyDrivePickerTarget === "backup"){
      setLegacyManualBackupSheetUrl(
        url,
      );
    }else{
      setLegacyManualWorkingSheetUrl(
        url,
      );
    }

    clearLegacyManualGoogleValidation();
    legacyCloseDrivePicker();
  }

  async function legacyValidateManualGoogleStorage(){
    setLegacyManualGoogleBusy(
      "validate",
    );

    setLegacyManualGoogleMessage(
      "",
    );

    try{
      const result =
        await legacyManualGoogleRequest(
          "/google/settings/manual/validate",
          legacyManualGooglePayload(),
        );

      setLegacyManualGoogleValidation(
        result,
      );

      setLegacyManualGoogleMessage(
        result.canSave
          ?
          (
            dashboardLanguage === "ms"
              ? "Semua link Google sah dan sedia untuk disimpan."
              : "All Google links are valid and ready to save."
          )
          :
          result.installRequired
            ?
            (
              dashboardLanguage === "ms"
                ? "Google Sheet kosong dikesan. Pasang template MyPocket dahulu."
                : "An empty Google Sheet was detected. Install the MyPocket template first."
            )
            :
            (
              dashboardLanguage === "ms"
                ? "Google Sheet tidak serasi dengan template MyPocket dan tidak akan diubah."
                : "The Google Sheet is not compatible with MyPocket and will not be modified."
            ),
      );
    }catch(error){
      setLegacyManualGoogleValidation(
        null,
      );

      setLegacyManualGoogleMessage(
        error instanceof Error
          ? error.message
          : dashboardLanguage === "ms"
            ? "Validation Google gagal."
            : "Google validation failed.",
      );
    }finally{
      setLegacyManualGoogleBusy(
        null,
      );
    }
  }

  async function legacyInstallManualGoogleTemplate(
    spreadsheetUrl:string,
  ){
    setLegacyManualGoogleBusy(
      "install",
    );

    setLegacyManualGoogleMessage(
      "",
    );

    try{
      await legacyManualGoogleRequest(
        "/google/settings/manual/install-template",
        {
          spreadsheetUrl,
        },
      );

      const validation =
        await legacyManualGoogleRequest(
          "/google/settings/manual/validate",
          legacyManualGooglePayload(),
        );

      setLegacyManualGoogleValidation(
        validation,
      );

      setLegacyManualGoogleMessage(
        dashboardLanguage === "ms"
          ? "Template MyPocket berjaya dipasang. Semak status dan simpan link Google."
          : "MyPocket template installed successfully. Review the status and save the Google links.",
      );
    }catch(error){
      setLegacyManualGoogleMessage(
        error instanceof Error
          ? error.message
          : dashboardLanguage === "ms"
            ? "Template MyPocket gagal dipasang."
            : "MyPocket template could not be installed.",
      );
    }finally{
      setLegacyManualGoogleBusy(
        null,
      );
    }
  }

  async function legacySaveManualGoogleStorage(){
    setLegacyManualGoogleBusy(
      "save",
    );

    setLegacyManualGoogleMessage(
      "",
    );

    try{
      await legacyManualGoogleRequest(
        "/google/settings/manual/save",
        legacyManualGooglePayload(),
      );

      setLegacyManualGoogleMessage(
        dashboardLanguage === "ms"
          ? "Google Folder dan Google Sheet berjaya disimpan sebagai sumber MyPocket workspace."
          : "Google Folder and Google Sheets were saved as the MyPocket workspace source.",
      );

      await props.refresh();
    }catch(error){
      setLegacyManualGoogleMessage(
        error instanceof Error
          ? error.message
          : dashboardLanguage === "ms"
            ? "Google links gagal disimpan."
            : "Google links could not be saved.",
      );
    }finally{
      setLegacyManualGoogleBusy(
        null,
      );
    }
  }

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

  const transactionDateRange =
    resolveTransactionFilterRange(
      transactionFilter,
      transactionCustomFrom,
      transactionCustomTo,
    );

  const filteredTransactions =
    props.data.transactions
      .filter(
        (transaction) =>
          transactionMatchesFilter(
            transaction,
            transactionDateRange,
          ),
      );

  const transactionFilterLabel =
    transactionFilterDisplayLabel(
      transactionFilter,
      transactionDateRange,
      dashboardLanguage,
    );

  const visibleTransactionIds =
    filteredTransactions
      .map(
        (transaction) =>
          String(
            transaction.id
            ||
            "",
          )
            .trim(),
      )
      .filter(
        Boolean,
      );

  const selectedVisibleTransactionIds =
    visibleTransactionIds
      .filter(
        (transactionId) =>
          selectedTransactionIds.includes(
            transactionId,
          ),
      );

  const allVisibleTransactionsSelected =
    visibleTransactionIds.length > 0
    &&
    visibleTransactionIds.length <= 100
    &&
    selectedVisibleTransactionIds.length
      ===
      visibleTransactionIds.length;

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

  const hasDashboardGoogleSheet =
    Boolean(
      props.data.google?.spreadsheetId,
    );

  const isDashboardSetupComplete =
    hasDashboardGoogleSheet
    &&
    isWhatsAppConnected;

  useEffect(
    () => {

      setSelectedTransactionIds(
        [],
      );

    },
    [
      transactionFilter,
      transactionCustomFrom,
      transactionCustomTo,
    ],
  );


  function toggleTransactionSelection(
    transactionId:string,
  ){

    const normalizedId =
      String(
        transactionId
        ||
        "",
      )
        .trim();


    if(!normalizedId){
      return;
    }


    if(
      selectedTransactionIds.includes(
        normalizedId,
      )
    ){

      setSelectedTransactionIds(
        selectedTransactionIds.filter(
          (id) =>
            id !== normalizedId,
        ),
      );

      return;

    }


    if(
      selectedTransactionIds.length
      >=
      100
    ){

      setActionMessage(
        dashboardLanguage === "ms"
          ? "Maksimum 100 transaksi boleh dipilih dalam satu operasi."
          : "A maximum of 100 transactions can be selected in one operation.",
      );

      return;

    }


    setSelectedTransactionIds([
      ...selectedTransactionIds,
      normalizedId,
    ]);

  }


  function toggleSelectAllVisibleTransactions(){

    if(
      allVisibleTransactionsSelected
    ){

      setSelectedTransactionIds(
        [],
      );

      return;

    }


    const nextIds =
      visibleTransactionIds
        .slice(
          0,
          100,
        );


    setSelectedTransactionIds(
      nextIds,
    );


    if(
      visibleTransactionIds.length
      >
      100
    ){

      setActionMessage(
        dashboardLanguage === "ms"
          ? "100 transaksi pertama dipilih. Had maksimum setiap operasi ialah 100."
          : "The first 100 transactions were selected. The maximum per operation is 100.",
      );

    }

  }


  async function bulkDeleteSelectedTransactions(){

    if(
      !canBulkDeleteTransactions
      ||
      bulkDeleteBusy
    ){

      return;

    }


    const transactionIds =
      selectedVisibleTransactionIds
        .slice(
          0,
          100,
        );


    if(
      transactionIds.length === 0
    ){

      setActionMessage(
        dashboardLanguage === "ms"
          ? "Pilih sekurang-kurangnya satu transaksi untuk dipadam."
          : "Select at least one transaction to delete.",
      );

      return;

    }


    const confirmed =
      window.confirm(
        dashboardLanguage === "ms"
          ? `Padam ${transactionIds.length} transaksi dipilih? Rekod Google Sheet akan ditanda [DELETED] dan tidak dipadam secara kekal.`
          : `Delete ${transactionIds.length} selected transactions? Google Sheet rows will be marked [DELETED] and will not be permanently removed.`,
      );


    if(!confirmed){
      return;
    }


    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";


    if(!activeToken){

      setActionMessage(
        dashboardLanguage === "ms"
          ? "Session telah tamat. Sila log masuk semula."
          : "Your session has expired. Please sign in again.",
      );

      return;

    }


    setBulkDeleteBusy(
      true,
    );

    setActionMessage(
      "",
    );


    try{

      const result =
        await api<{
          requestedCount:number;
          deletedCount:number;
          deletedIds:string[];
          missingIds:string[];
          marker:string;
        }>(
          "/transactions/bulk-delete",
          activeToken,
          {
            method:
              "POST",

            body:
              JSON.stringify({
                transactionIds,
              }),
          },
        );


      setSelectedTransactionIds(
        [],
      );


      const refreshed =
        await props.refresh();


      const missingCount =
        Array.isArray(
          result.missingIds,
        )
          ? result.missingIds.length
          : 0;


      setActionMessage(
        dashboardLanguage === "ms"
          ?
          [
            `${result.deletedCount} transaksi berjaya ditanda [DELETED].`,
            missingCount > 0
              ? `${missingCount} transaksi tidak lagi ditemui.`
              : "",
            refreshed
              ? ""
              : "Transaksi telah dipadam tetapi refresh dashboard gagal; tekan Refresh.",
          ]
            .filter(
              Boolean,
            )
            .join(
              " ",
            )
          :
          [
            `${result.deletedCount} transactions were marked [DELETED].`,
            missingCount > 0
              ? `${missingCount} transactions were no longer found.`
              : "",
            refreshed
              ? ""
              : "Deletion succeeded but dashboard refresh failed; press Refresh.",
          ]
            .filter(
              Boolean,
            )
            .join(
              " ",
            ),
      );

    }catch(error){

      setActionMessage(
        error instanceof Error
          ? error.message
          : dashboardLanguage === "ms"
            ? "Bulk delete transaksi gagal."
            : "Bulk transaction delete failed.",
      );

    }finally{

      setBulkDeleteBusy(
        false,
      );

    }

  }


  async function refreshDashboard(){

    setActionMessage("");

    const refreshed =
      await props.refresh();

    setActionMessage(
      refreshed
        ? dashboardLanguage === "ms"
          ? "Dashboard berjaya disegarkan."
          : "Dashboard refreshed successfully."
        : dashboardLanguage === "ms"
          ? "Dashboard gagal disegarkan. Semak mesej ralat."
          : "Dashboard refresh failed. Check the error message.",
    );

  }

  async function saveWorkspaceName(){

    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";


    if(!activeToken){

      setActionMessage(
        "Session telah tamat. Sila log masuk semula.",
      );

      return;

    }


    const normalizedName =
      workspaceName
        .trim()
        .replace(
          /\s+/g,
          " ",
        );


    if(
      normalizedName.length < 3
      ||
      normalizedName.length > 80
    ){

      setActionMessage(
        "Nama workspace mestilah antara 3 hingga 80 aksara.",
      );

      return;

    }


    setWorkspaceNameBusy(
      true,
    );


    try{

      const result =
        await api<{
          id:string;
          name:string;
          type:WorkspaceType;
          role:MemberRole;
        }>(
          "/workspace/name",
          activeToken,
          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                name:
                  normalizedName,
              }),
          },
        );


      setWorkspaceName(
        result.name,
      );

      setActionMessage(
        `Nama workspace berjaya ditukar kepada ${result.name}.`,
      );

      await props.refresh();

    }catch(error){

      setActionMessage(
        error instanceof Error
          ? error.message
          : "Nama workspace tidak berjaya disimpan.",
      );

    }finally{

      setWorkspaceNameBusy(
        false,
      );

    }

  }



  async function saveWhatsAppBotAlias(
    botAlias:string,
  ){

    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";

    if(!activeToken){

      throw new Error(
        "Session telah tamat. Sila log masuk semula.",
      );

    }

    const result =
      await api<{
        botAlias:string;
        groupTrigger:string;
      }>(
        "/whatsapp/bot-alias",
        activeToken,
        {
          method:"PATCH",

          body:
            JSON.stringify({
              botAlias,
            }),
        },
      );

    setActionMessage(
      `WhatsApp group trigger disimpan sebagai ${result.groupTrigger}.`,
    );

    await props.refresh();

  }

  async function reloadCommitments(
    status = commitmentFilter,
    message = "Commitments refreshed.",
  ){
    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";

    if(!activeToken){
      setActionMessage("Session telah tamat. Sila log masuk semula.");
      return;
    }

    const result =
      await api<CommitmentListData>(
        `/commitments?status=${encodeURIComponent(status)}`,
        activeToken,
      );

    setCommitmentsViewData(
      result,
    );
    setActionMessage(
      message,
    );
  }

  async function createCommitment(){
    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";

    if(!activeToken){
      setActionMessage("Session telah tamat. Sila log masuk semula.");
      return;
    }

    if(!commitmentName.trim() || !commitmentAmount.trim()){
      setActionMessage("Nama dan jumlah komitmen diperlukan.");
      return;
    }

    await api(
      "/commitments",
      activeToken,
      {
        method:"POST",
        body:JSON.stringify({
          name:commitmentName.trim(),
          amount:commitmentAmount.trim(),
          dueDay:Number(commitmentDueDay),
          reminderDaysBefore:Number(commitmentReminderDays),
          reminderTime:commitmentReminderTime,
        }),
      },
    );

    setCommitmentName("");
    setCommitmentAmount("");
    await reloadCommitments(
      commitmentFilter,
      "Commitment berjaya ditambah.",
    );
  }

  async function updateCommitmentStatus(
    id:string,
    body:Record<string, unknown>,
    message:string,
  ){
    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";

    if(!activeToken){
      setActionMessage("Session telah tamat. Sila log masuk semula.");
      return;
    }

    await api(
      `/commitments/${id}`,
      activeToken,
      {
        method:"PATCH",
        body:JSON.stringify(body),
      },
    );

    await reloadCommitments(
      commitmentFilter,
      message,
    );
  }

  async function archiveCommitment(
    id:string,
  ){
    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";

    await api(
      `/commitments/${id}/archive`,
      activeToken,
      { method:"POST" },
    );
    await reloadCommitments(
      commitmentFilter,
      "Commitment diarchive. Sejarah tidak dipadam.",
    );
  }

  async function markCommitmentPaid(
    id:string,
  ){
    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";

    await api(
      `/commitments/${id}/pay-current`,
      activeToken,
      { method:"POST" },
    );
    await reloadCommitments(
      commitmentFilter,
      "Commitment bulan semasa ditanda PAID.",
    );
  }

  async function saveBotSettings(){
    const activeToken =
      localStorage.getItem(
        STORAGE.token,
      )
      ||
      "";

    await api(
      "/bot-settings",
      activeToken,
      {
        method:"PATCH",
        body:JSON.stringify({
          botEnabled,
          replyLanguage:botReplyLanguage,
          timezone:botTimezone,
          defaultReminderDaysBefore:Number(botReminderDays),
          defaultReminderTime:botReminderTime,
          quietHoursStart:botQuietStart,
          quietHoursEnd:botQuietEnd,
        }),
      },
    );
    setActionMessage("Bot settings disimpan.");
    await props.refresh();
  }

  const navItems:Array<{
    icon:string;
    label:string;
    view:DashboardView;
  }> =
    [
      {
        icon:"home",
        label:dashboardText.navDashboard,
        view:"dashboard",
      },
      {
        icon:"transactions",
        label:dashboardText.navTransactions,
        view:"transactions",
      },
      {
        icon:"reminder",
        label:dashboardText.navCommitments,
        view:"commitments",
      },
      ...(canViewWorkspaceSettings
        ? [
          {
            icon:"whatsapp",
            label:dashboardText.navWhatsApp,
            view:"whatsapp" as DashboardView,
          },
          {
            icon:"sheet",
            label:dashboardText.navGoogleSheet,
            view:"google" as DashboardView,
          },
        ]
        : []),
      ...(canUseAdmin
        ? [
          {
            icon:"users",
            label:dashboardText.navAdmin,
            view:"admin" as DashboardView,
          },
        ]
        : []),
      ...(canViewWorkspaceSettings
        ? [
          {
            icon:"settings",
            label:dashboardText.navBotSettings,
            view:"bot-settings" as DashboardView,
          },
          {
            icon:"settings",
            label:dashboardText.navSettings,
            view:"settings" as DashboardView,
          },
        ]
        : []),
    ];

  useEffect(
    () => {
      const syncViewFromHash =
        () => setActiveView(
          readDashboardViewFromHash(),
        );

      window.addEventListener("hashchange", syncViewFromHash);

      return () => window.removeEventListener(
        "hashchange",
        syncViewFromHash,
      );
    },
    [],
  );


  useEffect(
    () => {
      if(
        !canViewWorkspaceSettings
        &&
        activeView !== "dashboard"
        &&
        activeView !== "transactions"
        &&
        !(
          isSuperAdmin
          &&
          activeView === "admin"
        )
      ){
        setActiveView("dashboard");

        if(typeof window !== "undefined"){
          window.location.hash =
            "dashboard";
        }
      }
    },
    [
      activeView,
      canViewWorkspaceSettings,
      isSuperAdmin,
    ],
  );


  function goToView(
    view:DashboardView,
  ){

    setActiveView(view);

    if(typeof window !== "undefined"){
      window.history.replaceState(
        null,
        "",
        `#${view}`,
      );
    }

    setActionMessage("");

  }

  function updateDashboardLanguage(
    value:DashboardLanguage,
  ){

    const normalized =
      normalizeDashboardLanguage(
        value,
      );

    setDashboardLanguage(
      normalized,
    );

    localStorage.setItem(
      STORAGE.dashboardLanguage,
      normalized,
    );

    setActionMessage(
      DASHBOARD_TEXT[normalized].languageSaved,
    );

  }


  function showActionMessage(
    message:string,
    view?:DashboardView,
  ){

    if(view){
      setActiveView(view);
      writeDashboardViewHash(view);
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

  async function createMemberInvite(){

    const token =
      stored(STORAGE.token);

    const response =
      await api<{
        inviteUrl:string;
      }>(
        "/workspace/invites",
        token,
        {
          method:"POST",
          body:JSON.stringify({
            email:
              linkEmail,

            whatsappPhoneNumber:
              linkPhone,

            role:
              newMemberRole,
          }),
        },
      );

    setInviteUrl(
      response.inviteUrl,
    );

    setActionMessage(
      "Invite link created. Share this link with the member.",
    );

    props.refresh();

  }

  async function addMember(){

    const token =
      stored(STORAGE.token);

    await api(
      "/workspace/members",
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
      `/workspace/members/${memberId}/role`,
      token,
      {
        method:"PATCH",
        body:JSON.stringify({
          role,
        }),
      },
    );

    setPendingMemberRoles((current) => {
      const next = {
        ...current,
      };

      delete next[memberId];

      return next;
    });

    setActionMessage("Member role updated.");
    props.refresh();
  }


  async function superAdminUserAction(
    userId:string,
    action:
      | "google-sheet/upgrade"
      | "whatsapp/disconnect"
      | "ban"
      | "unban"
      | "deactivate"
      | "reactivate"
      | "delete",
    label:string,
    confirmText:string,
  ){

    const confirmed =
      window.confirm(
        confirmText,
      );


    if(!confirmed){
      return;
    }


    const token =
      stored(STORAGE.token);


    setPackageBusyUserId(
      userId,
    );


    try{

      await api(
        `/workspace/admin/users/${userId}/${action}`,
        token,
        {
          method:"POST",
          body:JSON.stringify({}),
        },
      );


      setActionMessage(
        label,
      );


      await props.refresh();

    }finally{

      setPackageBusyUserId("");

    }

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
      `/workspace/members/${memberId}`,
      token,
      {
        method:"DELETE",
        body:JSON.stringify({}),
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

  function openBillingManager(){

    setBillingError("");
    setBillingOpen(true);

  }


  async function selectBillingPlan(
    plan:BillingPlan,
  ){

    if(!canManageBilling){

      setBillingError(
        "Only the workspace Owner can manage subscriptions.",
      );

      return;

    }


    const token =
      stored(
        STORAGE.token,
      );


    if(!token){

      setBillingError(
        "Your login session is unavailable. Please sign in again.",
      );

      return;

    }


    const billing =
      props.data.billing?.billing
      ??
      null;


    setBillingBusyPlan(
      plan,
    );

    setBillingError("");


    try{

      if(
        billing?.pendingPlan
        === plan
      ){

        setActionMessage(
          `${billingPlanLabel(plan)} is already scheduled for the next billing cycle.`,
        );

        return;

      }


      if(
        billing
        &&
        [
          "ACTIVE",
          "SCHEDULED",
          "RETRYING",
        ].includes(
          billing.status,
        )
      ){

        const result =
          await api<{
            currentPlan:BillingPlan;
            pendingPlan:BillingPlan;
            status:string;
            effective:string;
            reused:boolean;
          }>(
            "/billing/hitpay/plan",
            token,
            {
              method:
                "PUT",

              body:
                JSON.stringify({
                  plan,
                }),
            },
          );


        setActionMessage(
          result.reused
            ? `${billingPlanLabel(plan)} is already scheduled for the next billing cycle.`
            : `${billingPlanLabel(plan)} will take effect on the next billing cycle.`,
        );


        props.refresh();

        return;

      }


      if(
        billing?.checkoutUrl
        &&
        billing.plan === plan
        &&
        [
          "CHECKOUT_PENDING",
          "PENDING",
        ].includes(
          billing.status,
        )
      ){

        window.location.assign(
          billing.checkoutUrl,
        );

        return;

      }


      if(billing){

        throw new Error(
          "This subscription is still being processed. Please refresh before choosing another plan.",
        );

      }


      const result =
        await api<{
          checkoutUrl:string;
          plan:BillingPlan;
          reused:boolean;
        }>(
          "/billing/hitpay/checkout",
          token,
          {
            method:
              "POST",

            body:
              JSON.stringify({
                plan,
              }),
          },
        );


      if(!result.checkoutUrl){

        throw new Error(
          "HitPay checkout URL was not returned.",
        );

      }


      window.location.assign(
        result.checkoutUrl,
      );

    }catch(error){

      setBillingError(
        error instanceof Error
          ? error.message
          : "Unable to manage the subscription.",
      );

    }finally{

      setBillingBusyPlan(
        null,
      );

    }

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

          {isSuperAdmin && (
            <button
              type="button"
              className={
                activeView === "super-admin"
                  ? "active"
                  : ""
              }
              onClick={() =>
                goToView("super-admin")
              }
            >
              <span
                className="super-admin-nav-icon"
                aria-hidden="true"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>

              Super Admin
            </button>
          )}

          <button
            type="button"
            className="sideCard sideCardInline billingSideCard"
            onClick={openBillingManager}
            aria-label="Manage subscription plan"
          >
            <strong>
              {billingPlanLabel(
                currentAccessPlan,
              )}
            </strong>

            <span>
              <i aria-hidden="true" />

              {
                pendingBillingPlan
                  ? `Next: ${billingPlanLabel(
                      pendingBillingPlan,
                    )}`
                  : billingStatusLabel(
                      currentBillingStatus,
                    )
              }
            </span>

            <small>
              {dashboardText.managePlan}
            </small>
          </button>
        </nav>

      </aside>

      <main
        className={
          activeView === "super-admin"
            ? "main superAdminMain"
            : "main"
        }
      >
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
              {dashboardText.apiHealthy}
            </span>
            {!isDashboardSetupComplete && (
              <>
                <button
                  className="ghost"
                  onClick={props.installApp}
                >
                  {dashboardText.install}
                </button>
                <button
                  className="ghost"
                  onClick={props.resetWizard}
                >
                  {dashboardText.setup}
                </button>
              </>
            )}
            <button
              className="ghost"
              onClick={props.signOut}
            >
              {dashboardText.logout}
            </button>
          </div>
        </header>

        {props.notice && (
          <div
            className="notice"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {props.notice}
          </div>
        )}

        {actionMessage && (
          <div
            className="notice"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {actionMessage}
          </div>
        )}

        {props.state.error && (
          <div
            className="errorBox"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            {props.state.error}
          </div>
        )}

        {activeView === "dashboard" && (
          <PremiumDashboard
            data={{
              ...props.data,
              transactions:
                filteredTransactions,
            }}
            transactionFilter={transactionFilter}
            transactionFilterLabel={transactionFilterLabel}
            transactionCustomFrom={transactionCustomFrom}
            transactionCustomTo={transactionCustomTo}
            filterStart={
              transactionDateRange.start?.getTime()
              ??
              null
            }
            filterEnd={
              transactionDateRange.end?.getTime()
              ??
              null
            }
            onTransactionFilterChange={
              setTransactionFilter
            }
            onTransactionCustomFromChange={
              setTransactionCustomFrom
            }
            onTransactionCustomToChange={
              setTransactionCustomTo
            }
            onRefresh={props.refresh}
            onSetup={props.resetWizard}
            onRecreateGoogle={props.recreateGoogleSheet}
            onUpdateGoogle={props.updateGoogleSheetTemplate}
            canUpdateGoogleTemplate={
              actorRole === "OWNER"
            }
            canManageGoogleStorage={
              actorRole === "OWNER"
              ||
              actorRole === "ADMIN"
            }
            onOpenTransactions={() =>
              setActiveView("transactions")
            }
            onOpenWhatsApp={() =>
              setActiveView("whatsapp")
            }
            canManageWhatsApp={
              canViewWorkspaceSettings
            }
            onSaveWhatsAppAlias={
              saveWhatsAppBotAlias
            }
            language={dashboardLanguage}
            onAddTransaction={() =>
              showActionMessage(
                dashboardLanguage === "ms"
                  ? "Untuk tambah transaksi, hantar mesej kepada WhatsApp bot seperti: makan nasi RM8 TNG."
                  : "To add a transaction, send a WhatsApp bot message like: lunch mamak RM8 TNG.",
              )
            }
          />
        )}

        <section
          className={
            activeView === "dashboard"
              ? "grid pd-legacy-hidden"
              : activeView === "super-admin"
                ? "grid appFullWidthGrid superAdminGrid"
                : "grid appFullWidthGrid"
          }
        >
          {(activeView === "dashboard" || activeView === "transactions") && (
            <Panel title={activeView === "transactions" ? dashboardText.transactions : dashboardText.recentTransactions} wide>
              {activeView === "transactions" && (
                <TransactionFilterControls
                  mode={transactionFilter}
                  label={transactionFilterLabel}
                  customFrom={transactionCustomFrom}
                  customTo={transactionCustomTo}
                  transactionCount={filteredTransactions.length}
                  language={dashboardLanguage}
                  onModeChange={setTransactionFilter}
                  onCustomFromChange={setTransactionCustomFrom}
                  onCustomToChange={setTransactionCustomTo}
                />
              )}

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    {
                      activeView === "transactions"
                      &&
                      canBulkDeleteTransactions
                      &&
                      (
                        <th>
                          <input
                            type="checkbox"
                            checked={allVisibleTransactionsSelected}
                            disabled={
                              bulkDeleteBusy
                              ||
                              filteredTransactions.length === 0
                            }
                            aria-label={
                              dashboardLanguage === "ms"
                                ? "Pilih semua transaksi dipaparkan"
                                : "Select all displayed transactions"
                            }
                            onChange={
                              toggleSelectAllVisibleTransactions
                            }
                          />
                        </th>
                      )
                    }
                    <th>{dashboardText.date}</th>
                    <th>{dashboardText.type}</th>
                    <th>{dashboardText.category}</th>
                    <th>{dashboardText.merchant}</th>
                    <th>{dashboardText.amount}</th>
                    <th>{dashboardText.source}</th>
                    <th>{dashboardText.recordedBy}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={
                          activeView === "transactions"
                          &&
                          canBulkDeleteTransactions
                            ? 8
                            : 7
                        }
                        className="hint"
                        role="status"
                        aria-live="polite"
                      >
                        {
                          dashboardLanguage === "ms"
                            ? "Tiada transaksi untuk tempoh dipilih."
                            : "No transactions for the selected period."
                        }
                      </td>
                    </tr>
                  )}

                  {filteredTransactions.map((item) => (
                    <tr key={item.id}>
                      {
                        activeView === "transactions"
                        &&
                        canBulkDeleteTransactions
                        &&
                        (
                          <td>
                            <input
                              type="checkbox"
                              checked={
                                selectedTransactionIds.includes(
                                  item.id,
                                )
                              }
                              disabled={
                                bulkDeleteBusy
                                ||
                                (
                                  !selectedTransactionIds.includes(
                                    item.id,
                                  )
                                  &&
                                  selectedTransactionIds.length >= 100
                                )
                              }
                              aria-label={
                                dashboardLanguage === "ms"
                                  ? `Pilih transaksi ${item.id}`
                                  : `Select transaction ${item.id}`
                              }
                              onChange={
                                () =>
                                  toggleTransactionSelection(
                                    item.id,
                                  )
                              }
                            />
                          </td>
                        )
                      }
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

                      <td>

                        {

                          item.createdBy?.name

                          ||

                          item.createdBy?.email

                          ||

                          item.createdByEmail

                          ||

                          props.data.members.find(

                            (member) =>

                              member.userId === item.createdById,

                          )?.name

                          ||

                          props.data.members.find(

                            (member) =>

                              member.userId === item.createdById,

                          )?.email

                          ||

                          "-"

                        }

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              {activeView === "transactions" && (
                <div className="panelActions">
                  {
                    canBulkDeleteTransactions
                    &&
                    (
                      <button
                        className="ghost danger"
                        onClick={
                          bulkDeleteSelectedTransactions
                        }
                        disabled={
                          bulkDeleteBusy
                          ||
                          selectedVisibleTransactionIds.length === 0
                        }
                      >
                        {
                          bulkDeleteBusy
                            ? dashboardLanguage === "ms"
                              ? "Memadam..."
                              : "Deleting..."
                            : dashboardLanguage === "ms"
                              ? `Delete Selected (${selectedVisibleTransactionIds.length})`
                              : `Delete Selected (${selectedVisibleTransactionIds.length})`
                        }
                      </button>
                    )
                  }

                  <button
                    className="primary"
                    onClick={() => showActionMessage(
                      "Untuk tambah transaksi sekarang, hantar mesej ke WhatsApp bot seperti: makan nasi rm8 tng. Form transaksi manual web akan dibuat dalam batch seterusnya.",
                    )}
                  >
                    {dashboardText.addTransaction}
                  </button>

                  <button
                    className="ghost"
                    onClick={props.refresh}
                  >
                    {dashboardText.refreshTransactions}
                  </button>
                </div>
              )}
            </Panel>
          )}

          {activeView === "commitments" && (
            <Panel title={dashboardText.commitments} wide>
              <div className="commitmentToolbar">
                <select
                  value={commitmentFilter}
                  onChange={async (event) => {
                    const value = event.target.value;
                    setCommitmentFilter(value);
                    await reloadCommitments(value);
                  }}
                >
                  <option value="unpaid">{dashboardText.unpaid}</option>
                  <option value="paid">{dashboardText.paid}</option>
                  <option value="overdue">{dashboardText.overdue}</option>
                  <option value="all">{dashboardText.all}</option>
                  <option value="inactive">{dashboardText.inactive}</option>
                </select>
                <button className="ghost" onClick={() => reloadCommitments()}>
                  {dashboardText.refresh}
                </button>
                <span>
                  {commitmentsViewData?.period.label || dashboardText.currentMonth} · {dashboardText.totalUnpaid} RM{commitmentsViewData?.summary.totalUnpaid || "0.00"}
                </span>
              </div>

              <div className="commitmentForm">
                <label className="field">
                  {dashboardText.commitmentName}
                  <input value={commitmentName} onChange={(event) => setCommitmentName(event.target.value)} placeholder="Bayaran kereta" />
                </label>
                <label className="field">
                  {dashboardText.commitmentAmount}
                  <input value={commitmentAmount} onChange={(event) => setCommitmentAmount(event.target.value)} placeholder="1000" />
                </label>
                <label className="field">
                  {dashboardText.paymentDay}
                  <input type="number" min="1" max="31" value={commitmentDueDay} onChange={(event) => setCommitmentDueDay(event.target.value)} />
                </label>
                <label className="field">
                  {dashboardText.earlyReminder}
                  <input type="number" min="0" max="30" value={commitmentReminderDays} onChange={(event) => setCommitmentReminderDays(event.target.value)} />
                </label>
                <label className="field">
                  {dashboardText.time}
                  <input type="time" value={commitmentReminderTime} onChange={(event) => setCommitmentReminderTime(event.target.value)} />
                </label>
                <button className="primary" onClick={createCommitment}>
                  {dashboardText.addCommitment}
                </button>
              </div>

              <div className="commitmentList">
                {(commitmentsViewData?.items || []).map((item) => (
                  <div className="commitmentRow" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>RM{Number(item.amount).toLocaleString("ms-MY")} · {dashboardText.due} {new Date(item.currentMonth.dueDate).toLocaleDateString("ms-MY")} · {item.currentMonth.status}</span>
                      <small>{dashboardText.nextReminder}: {new Date(item.nextReminderAt).toLocaleString("ms-MY")}</small>
                    </div>
                    <div className="commitmentActions">
                      {item.currentMonth.status !== "PAID" && (
                        <button className="primary" onClick={() => markCommitmentPaid(item.id)} disabled={!item.canManage}>
                          {dashboardText.markPaid}
                        </button>
                      )}
                      <button className="ghost" onClick={() => updateCommitmentStatus(item.id, { isActive:!item.isActive }, item.isActive ? "Commitment dinyahaktifkan." : "Commitment diaktifkan.")} disabled={!item.canManage}>
                        {item.isActive ? dashboardText.deactivate : dashboardText.activate}
                      </button>
                      <button className="ghost danger" onClick={() => archiveCommitment(item.id)} disabled={!item.canManage || Boolean(item.archivedAt)}>
                        {dashboardText.archive}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeView === "bot-settings" && (
            <Panel title={dashboardText.navBotSettings} wide>
              <div className="commitmentForm botSettingsForm">
                <label className="field checkboxField">
                  <input type="checkbox" checked={botEnabled} onChange={(event) => setBotEnabled(event.target.checked)} />
                  {dashboardText.botEnabled}
                </label>
                <label className="field">
                  {dashboardText.replyLanguage}
                  <select value={botReplyLanguage} onChange={(event) => setBotReplyLanguage(event.target.value)}>
                    <option value="ms">Bahasa Melayu</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="field">
                  {dashboardText.timezone}
                  <input value={botTimezone} onChange={(event) => setBotTimezone(event.target.value)} />
                </label>
                <label className="field">
                  {dashboardText.defaultReminderDaysBefore}
                  <input type="number" min="0" max="30" value={botReminderDays} onChange={(event) => setBotReminderDays(event.target.value)} />
                </label>
                <label className="field">
                  {dashboardText.defaultReminderTime}
                  <input type="time" value={botReminderTime} onChange={(event) => setBotReminderTime(event.target.value)} />
                </label>
                <label className="field">
                  {dashboardText.quietHoursStart}
                  <input type="time" value={botQuietStart} onChange={(event) => setBotQuietStart(event.target.value)} />
                </label>
                <label className="field">
                  {dashboardText.quietHoursEnd}
                  <input type="time" value={botQuietEnd} onChange={(event) => setBotQuietEnd(event.target.value)} />
                </label>
                <button className="primary" onClick={saveBotSettings}>
                  {dashboardText.saveBotSettings}
                </button>
              </div>
              <p className="helperText">
                {dashboardText.botSettingsHelp}
              </p>
            </Panel>
          )}

          {canViewWorkspaceSettings && (activeView === "dashboard" || activeView === "whatsapp") && (
            <Panel title={dashboardText.navWhatsApp}>
            <StatusGrid
              rows={[
                ["Instance", props.data.whatsapp?.instance?.instanceName || "imai-dev"],
                ["Status", props.data.whatsapp?.instance?.status || "-"],
                ["Members", `${linked}/${props.data.members.length} linked`],
              ]}
            />

            <div className="memberList">
              {props.data.members.length === 0 && (
                <div
                  className="hint"
                  role="status"
                  aria-live="polite"
                >
                  {
                    dashboardLanguage === "ms"
                      ? "Tiada ahli workspace untuk dipaparkan."
                      : "No workspace members to display."
                  }
                </div>
              )}

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

          {canViewWorkspaceSettings && (activeView === "dashboard" || activeView === "google") && (
            <Panel title={dashboardText.navGoogleSheet}>
              <StatusGrid
                rows={[
                  ["Workspace package", workspaceType],
                  ["Template", googleTemplateType || workspaceType],
                  ["Title", props.data.google?.spreadsheetTitle || "-"],
                  ["Backup", props.data.google?.backupSpreadsheetTitle || "-"],
                  ["Mode", props.data.google?.mode || "-"],
                  [
                    "Current Template",
                    props.data.google?.currentTemplateVersion || "-",
                  ],
                  [
                    "Latest Template",
                    props.data.google?.latestTemplateVersion || "-",
                  ],
                  [
                    "Update Status",
                    props.data.google?.templateUpdateAvailable
                      ? "Update Available"
                      : props.data.google?.templateUpdateStatus || "-",
                  ],
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

              {props.data.google?.templateUpdateAvailable && (
                <div className="sheetWarning">
                  Current Template: Version {
                    props.data.google?.currentTemplateVersion || "-"
                  }. Latest Template: Version {
                    props.data.google?.latestTemplateVersion || "-"
                  }. {
                    props.data.google?.templateUpdateSupported
                      ? "Update tersedia tanpa memadam rekod transaksi."
                      : props.data.google?.templateUpdateMessage
                  }
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


              {canChangeWorkspaceSettings && (
                <div className="pd-manual-google">
                  <div className="pd-manual-google-title">
                    {
                      dashboardLanguage === "ms"
                        ? "Tetapan Google Manual"
                        : "Manual Google Settings"
                    }
                  </div>

                  <div
                    className="manualGoogleModeToggle"
                    role="group"
                    aria-label="Google storage mode"
                  >
                    <button
                      type="button"
                      className={legacyManualStorageMode === "auto" ? "primary" : "ghost"}
                      onClick={() =>
                        setLegacyManualStorageMode(
                          "auto",
                        )
                      }
                    >
                      Auto Create by System
                    </button>

                    <button
                      type="button"
                      className={legacyManualStorageMode === "manual" ? "primary" : "ghost"}
                      onClick={() =>
                        setLegacyManualStorageMode(
                          "manual",
                        )
                      }
                    >
                      Manual Select Existing
                    </button>
                  </div>

                  {
                    legacyManualStorageMode === "auto"
                    &&
                    (
                      <div className="pd-manual-google-message">
                        Auto Created mode will use the existing Connect/Recreate Google Sheet actions below. Use Manual Select Existing when the folder or sheet already exists in Google Drive.
                      </div>
                    )
                  }

                  <div className="panelActions sheetActions manualPickerActions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        legacyOpenDrivePicker(
                          "folder",
                        )
                      }
                    >
                      Select Google Drive Folder
                    </button>

                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        legacyOpenDrivePicker(
                          "working",
                        )
                      }
                    >
                      Select Working Google Sheet
                    </button>

                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        legacyOpenDrivePicker(
                          "backup",
                        )
                      }
                    >
                      Select Backup Google Sheet
                    </button>
                  </div>

                  <label className="pd-manual-google-field">
                    <span>
                      Google Drive Folder URL
                    </span>
                    <input
                      type="url"
                      value={legacyManualRootFolderUrl}
                      placeholder="https://drive.google.com/drive/folders/..."
                      onChange={(event) => {
                        setLegacyManualRootFolderUrl(
                          event.target.value,
                        );
                        clearLegacyManualGoogleValidation();
                      }}
                    />
                  </label>

                  <label className="pd-manual-google-field">
                    <span>
                      Working Google Sheet URL
                    </span>
                    <input
                      type="url"
                      value={legacyManualWorkingSheetUrl}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      onChange={(event) => {
                        setLegacyManualWorkingSheetUrl(
                          event.target.value,
                        );
                        clearLegacyManualGoogleValidation();
                      }}
                    />
                  </label>

                  <label className="pd-manual-google-field">
                    <span>
                      Backup Google Sheet URL (optional)
                    </span>
                    <input
                      type="url"
                      value={legacyManualBackupSheetUrl}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      onChange={(event) => {
                        setLegacyManualBackupSheetUrl(
                          event.target.value,
                        );
                        clearLegacyManualGoogleValidation();
                      }}
                    />
                  </label>

                  {
                    legacyManualGoogleValidation
                    &&
                    (
                      <div className="pd-manual-google-status">
                        <div>
                          <strong>
                            Folder:
                          </strong>{" "}
                          {
                            legacyManualGoogleValidation
                              .folder
                              ?.name
                            ||
                            "OK"
                          }
                        </div>

                        <div>
                          <strong>
                            Working:
                          </strong>{" "}
                          {
                            legacyManualGoogleValidation
                              .working
                              ?.classification
                            ||
                            "-"
                          }
                        </div>

                        {
                          legacyManualGoogleValidation
                            .backup
                          &&
                          (
                            <div>
                              <strong>
                                Backup:
                              </strong>{" "}
                              {
                                legacyManualGoogleValidation
                                  .backup
                                  ?.classification
                                ||
                                "-"
                              }
                            </div>
                          )
                        }
                      </div>
                    )
                  }

                  {
                    legacyManualGoogleMessage
                    &&
                    (
                      <div
                        className={
                          legacyManualGoogleValidation
                            ?.canSave
                            ? "pd-manual-google-message success"
                            : "pd-manual-google-message"
                        }
                      >
                        {legacyManualGoogleMessage}
                      </div>
                    )
                  }

                  <div className="panelActions sheetActions">
                    <button
                      type="button"
                      className="ghost"
                      disabled={
                        legacyManualGoogleBusy !== null
                        ||
                        !legacyManualRootFolderUrl.trim()
                        ||
                        !legacyManualWorkingSheetUrl.trim()
                      }
                      onClick={
                        legacyValidateManualGoogleStorage
                      }
                    >
                      {
                        legacyManualGoogleBusy === "validate"
                          ? dashboardLanguage === "ms"
                            ? "Menyemak..."
                            : "Validating..."
                          : "Validate Google Links"
                      }
                    </button>

                    {
                      legacyManualGoogleValidation
                        ?.working
                        ?.classification
                      ===
                      "EMPTY"
                      &&
                      (
                        <button
                          type="button"
                          className="ghost"
                          disabled={
                            legacyManualGoogleBusy !== null
                          }
                          onClick={() =>
                            legacyInstallManualGoogleTemplate(
                              legacyManualWorkingSheetUrl
                                .trim(),
                            )
                          }
                        >
                          Install Template - Working
                        </button>
                      )
                    }

                    {
                      legacyManualGoogleValidation
                        ?.backup
                        ?.classification
                      ===
                      "EMPTY"
                      &&
                      (
                        <button
                          type="button"
                          className="ghost"
                          disabled={
                            legacyManualGoogleBusy !== null
                          }
                          onClick={() =>
                            legacyInstallManualGoogleTemplate(
                              legacyManualBackupSheetUrl
                                .trim(),
                            )
                          }
                        >
                          Install Template - Backup
                        </button>
                      )
                    }

                    <button
                      type="button"
                      className="primary"
                      disabled={
                        legacyManualGoogleBusy !== null
                        ||
                        !legacyManualGoogleValidation
                          ?.canSave
                      }
                      onClick={
                        legacySaveManualGoogleStorage
                      }
                    >
                      {
                        legacyManualGoogleBusy === "save"
                          ? dashboardLanguage === "ms"
                            ? "Menyimpan..."
                            : "Saving..."
                          : "Save Google Links"
                      }
                    </button>
                  </div>
                </div>
              )}

              {legacyDrivePickerTarget && (
                <div
                  className="googlePickerOverlay"
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="googlePickerModal">
                    <div className="googlePickerHeader">
                      <div>
                        <strong>MyPocket Drive Picker</strong>
                        <span>{legacyDrivePickerTitle()}</span>
                      </div>

                      <button
                        type="button"
                        className="ghost"
                        onClick={legacyCloseDrivePicker}
                      >
                        Close
                      </button>
                    </div>

                    <div className="googlePickerSearch">
                      <input
                        value={legacyDrivePickerQuery}
                        placeholder="Search in your Google Drive"
                        onChange={(event) =>
                          setLegacyDrivePickerQuery(
                            event.target.value,
                          )
                        }
                      />

                      <button
                        type="button"
                        className="ghost"
                        onClick={() =>
                          legacyLoadDrivePickerItems()
                        }
                      >
                        Search
                      </button>
                    </div>

                    {legacyDrivePickerMessage && (
                      <div className="pd-manual-google-message">
                        {legacyDrivePickerMessage}
                      </div>
                    )}

                    <div className="googlePickerList">
                      {legacyDrivePickerBusy && (
                        <div className="googlePickerEmpty">
                          Loading Google Drive...
                        </div>
                      )}

                      {!legacyDrivePickerBusy && legacyDrivePickerItems.length === 0 && (
                        <div className="googlePickerEmpty">
                          No item selected yet. Search or choose from the latest Drive items.
                        </div>
                      )}

                      {!legacyDrivePickerBusy && legacyDrivePickerItems.map(
                        (item) => (
                          <button
                            type="button"
                            key={item.id}
                            className="googlePickerItem"
                            onClick={() =>
                              legacySelectDrivePickerItem(
                                item,
                              )
                            }
                          >
                            <span className="googlePickerIcon">
                              {item.kind === "folder" ? "📁" : "📄"}
                            </span>

                            <span>
                              <strong>{item.name || "Untitled"}</strong>
                              <small>{item.kind === "folder" ? "Google Drive Folder" : "Google Sheet"}</small>
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

            {props.data.google?.spreadsheetId && (
              <div className="panelActions sheetActions">
                {
                  actorRole === "OWNER"
                  &&
                  props.data.google?.templateUpdateAvailable
                  &&
                  (
                    <button
                      type="button"
                      className="primary"
                      disabled={
                        !props.data.google?.templateUpdateSupported
                      }
                      onClick={
                        props.updateGoogleSheetTemplate
                      }
                    >
                      Update Google Sheet
                    </button>
                  )
                }

                <button
                  className="primary"
                  onClick={openGoogleSheet}
                >
                  Open Google Sheet
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

          {activeView === "dashboard" && canViewWorkspaceSettings && (
            <Panel title={dashboardText.dashboardActions} wide>
            <div className="actions">
              <Action
                title={dashboardText.addTransaction}
                desc={dashboardLanguage === "ms" ? "Guna command mesej WhatsApp." : "Use WhatsApp message command."}
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
                    desc={dashboardLanguage === "ms" ? "Putuskan bot semasa sebelum pair semula." : "Disconnect the current bot before pairing again."}
                    icon="⏻"
                    onClick={() => props.resetWhatsAppInstance()}
                  />
                )
                : (
                  <Action
                    title="Open WhatsApp QR"
                    desc={dashboardLanguage === "ms" ? "Pair bot sekali dengan nombor WhatsApp anda." : "Pair the bot once with your WhatsApp number."}
                    icon="☏"
                    onClick={() => props.openWhatsAppQr("dashboard")}
                  />
                )}
              <Action title={dashboardText.openSetupWizard} desc={dashboardLanguage === "ms" ? "Semak langkah onboarding." : "Review onboarding steps."} icon="⚙" onClick={props.resetWizard} />
            </div>
            </Panel>
          )}

          {isSuperAdmin && activeView === "super-admin" && (
            <AdminUserManagement
              users={props.data.adminUsers}
              busyUserId={packageBusyUserId}
              message={actionMessage}
              onRefresh={props.refresh}
              onUpdatePackage={updateUserPackage}
              onSuperAdminUserAction={superAdminUserAction}
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
                {props.data.members.length === 0 && (
                  <div
                    className="hint"
                    role="status"
                    aria-live="polite"
                  >
                    {
                      dashboardLanguage === "ms"
                        ? "Tiada ahli workspace lagi."
                        : "No workspace members have been added yet."
                    }
                  </div>
                )}

                {props.data.members.map((member) => {
                  const isOwner =
                    member.role === "OWNER";

                  const adminCannotEdit =
                    actorRole === "ADMIN" &&
                    (
                      member.role === "OWNER" ||
                      member.role === "ADMIN"
                    );

                  const isOwnMember =
                    member.userId === props.data.me?.user?.id ||
                    member.email === props.data.me?.user?.email;

                  const canSuperAdminTestOwnRole =
                    Boolean(props.data.me?.isSuperAdmin) &&
                    props.data.me?.user?.email === "pillo0404@gmail.com" &&
                    isOwnMember;

                  const canEditMember =
                    (
                      canManageMembers &&
                      !isOwner &&
                      !adminCannotEdit
                    )
                    ||
                    canSuperAdminTestOwnRole;

                  const selectedRole =
                    pendingMemberRoles[member.memberId]
                    ??
                    member.role;

                  const roleChanged =
                    selectedRole !== member.role;

                  return (
                    <div className="memberRow" key={member.memberId}>
                      <div className="memberMain">
                        <strong>{member.name || member.email}</strong>
                        <span>{member.email}</span>
                        <span>{member.whatsappPhoneNumber || "WhatsApp belum linked"}</span>
                      </div>

                      <div className="memberControls">
                        <select
                          value={selectedRole}
                          disabled={!canEditMember}
                          onChange={(event) => setPendingMemberRoles((current) => ({
                            ...current,
                            [member.memberId]:
                              event.target.value as MemberRole,
                          }))}
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="MEMBER">MEMBER</option>
                              </select>

                        {roleChanged && (
                          <button
                            className="primary smallButton"
                            onClick={() => updateMemberRole(
                              member.memberId,
                              selectedRole,
                            )}
                          >
                            Save
                          </button>
                        )}

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
            <Panel title="Invite Member">
              <p className="helperText">
                Invite link akan bind email, nombor WhatsApp dan role kepada workspace ini.
                Member tidak akan create Google Sheet sendiri.
              </p>

              <label className="field">
                Member email
                <input
                  value={linkEmail}
                  onChange={(event) => {
                    setLinkEmail(event.target.value);
                    setInviteUrl("");
                  }}
                  placeholder="member@example.com"
                />
              </label>

              <label className="field">
                WhatsApp phone
                <input
                  value={linkPhone}
                  onChange={(event) => {
                    setLinkPhone(event.target.value);
                    setInviteUrl("");
                  }}
                  placeholder="60123456789"
                />
              </label>

              <label className="field">
                Role
                <select
                  value={newMemberRole}
                  onChange={(event) => {
                    setNewMemberRole(event.target.value as MemberRole);
                    setInviteUrl("");
                  }}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MEMBER">MEMBER</option>
                </select>
              </label>

              <button
                className="primary"
                onClick={createMemberInvite}
              >
                Create invite link
              </button>

              {inviteUrl && (
                <div className="inviteBox">
                  <span>Invite link</span>
                  <code>{inviteUrl}</code>
                  <button
                    className="ghost"
                    onClick={() => navigator.clipboard?.writeText(inviteUrl)}
                  >
                    Copy link
                  </button>
                </div>
              )}
            </Panel>
          )}

          {activeView === "settings" && (
            <Panel title={dashboardText.navSettings} wide>
              <StatusGrid
                rows={[
                  [dashboardText.workspace, props.data.me?.workspace?.name || "-"],
                  [dashboardText.workspaceType, props.data.me?.workspace?.type || "PERSONAL"],
                  [dashboardText.yourRole, actorRole],
                  ["Email", props.data.me?.user?.email || "-"],
                  [dashboardText.api, props.data.health ? dashboardText.healthy : dashboardText.checking],
                  [dashboardText.navGoogleSheet, props.data.google?.spreadsheetId ? dashboardText.connected : dashboardText.notConnected],
                  [dashboardText.navWhatsApp, props.data.whatsapp?.instance?.status || "-"],
                ]}
              />

              <div className="languageSettingsCard">
                <label className="field">
                  {dashboardText.dashboardLanguage}
                  <select
                    value={dashboardLanguage}
                    onChange={(event) =>
                      updateDashboardLanguage(
                        event.target.value as DashboardLanguage,
                      )
                    }
                  >
                    <option value="ms">Bahasa Melayu</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <p className="hint">
                  {dashboardText.dashboardLanguageHelp}
                </p>
              </div>

              {isSharedWorkspace && canChangeWorkspaceSettings && (
                <div
                  style={{
                    marginTop:
                      18,
                    padding:
                      16,
                    border:
                      "1px solid #d7e4e2",
                    borderRadius:
                      12,
                    background:
                      "#f7fbfa",
                  }}
                >
                  <strong>
                    Workspace name
                  </strong>

                  <p className="hint">
                    Gunakan nama keluarga, organisasi atau syarikat anda. Hanya Owner dan Admin boleh menukar nama ini.
                  </p>

                  <div
                    style={{
                      display:
                        "flex",
                      flexWrap:
                        "wrap",
                      gap:
                        10,
                      alignItems:
                        "center",
                    }}
                  >
                    <input
                      value={workspaceName}
                      maxLength={80}
                      disabled={workspaceNameBusy}
                      aria-label="Workspace name"
                      placeholder={
                        workspaceType === "BUSINESS"
                          ? "Contoh: AZ Prestige Sdn Bhd"
                          : "Contoh: Keluarga Nik"
                      }
                      onChange={(event) =>
                        setWorkspaceName(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {

                        if(event.key === "Enter"){

                          event.preventDefault();

                          void saveWorkspaceName();

                        }

                      }}
                      style={{
                        flex:
                          "1 1 320px",
                        minWidth:
                          220,
                        border:
                          "1px solid #cbdedb",
                        borderRadius:
                          8,
                        padding:
                          "10px 12px",
                        font:
                          "inherit",
                        background:
                          "#ffffff",
                      }}
                    />

                    <button
                      className="primary"
                      disabled={
                        workspaceNameBusy
                        ||
                        workspaceName.trim().length < 3
                        ||
                        workspaceName.trim() ===
                          (
                            props.data.me?.workspace?.name
                            ||
                            ""
                          )
                      }
                      onClick={() =>
                        void saveWorkspaceName()
                      }
                    >
                      {
                        workspaceNameBusy
                          ? "Saving..."
                          : "Save workspace name"
                      }
                    </button>
                  </div>

                  <p className="hint">
                    Menukar nama workspace tidak akan menukar nama fail Google Sheet.
                  </p>
                </div>
              )}

              <section className="billingSettingsCard">
                <div>
                  <span className="billingSettingsEyebrow">
                    Subscription
                  </span>

                  <strong>
                    {billingPlanLabel(
                      currentAccessPlan,
                    )}
                  </strong>

                  <p>
                    {
                      pendingBillingPlan
                        ? `${billingPlanLabel(
                            pendingBillingPlan,
                          )} is scheduled for the next billing cycle.`
                        : canManageBilling
                          ? "View available packages or manage your current subscription."
                          : "Subscription changes can only be made by the workspace Owner."
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={openBillingManager}
                >
                  {
                    canManageBilling
                      ? "Upgrade / manage plan"
                      : "View plan"
                  }
                </button>
              </section>

              <div className="panelActions">
                <button className="primary" onClick={props.installApp}>
                  {dashboardText.installApp}
                </button>

                <button className="ghost" onClick={props.resetWizard}>
                  {dashboardText.openSetupWizard}
                </button>

                <button className="ghost" onClick={props.refresh}>
                  {dashboardText.refreshDashboard}
                </button>

                <button className="ghost danger" onClick={props.signOut}>
                  {dashboardText.logout}
                </button>
              </div>
            </Panel>
          )}
        </section>

        <button
          className="floating"
          onClick={refreshDashboard}
          disabled={props.state.loading}
          aria-busy={props.state.loading}
        >
          {
            props.state.loading
              ? dashboardLanguage === "ms"
                ? "Menyegarkan..."
                : "Refreshing..."
              : dashboardText.refresh
          }
        </button>

        {billingOpen && (
          <BillingPlanModal
            workspaceType={
              workspaceType as WorkspaceType
            }
            currentAccessPlan={
              currentAccessPlan
            }
            currentBillingPlan={
              currentBillingPlan
            }
            pendingPlan={
              pendingBillingPlan
            }
            billingStatus={
              currentBillingStatus
            }
            checkoutUrl={
              props.data.billing
                ?.billing
                ?.checkoutUrl
              ??
              null
            }
            canManage={
              canManageBilling
            }
            busyPlan={
              billingBusyPlan
            }
            error={
              billingError
            }
            close={() =>
              setBillingOpen(false)
            }
            selectPlan={
              selectBillingPlan
            }
          />
        )}

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
          {navItems.map(
            (item) => (
              <button
                type="button"
                key={item.view}
                className={activeView === item.view ? "active" : ""}
                onClick={() => goToView(item.view)}
              >
                <AppIcon
                  name={item.icon}
                  size={18}
                  strokeWidth={2}
                />

                <span>
                  {item.label}
                </span>
              </button>
            ),
          )}

          {isSuperAdmin && (
            <button
              type="button"
              className={
                activeView === "super-admin"
                  ? "active"
                  : ""
              }
              onClick={() => goToView("super-admin")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
                <path d="m9 12 2 2 4-4" />
              </svg>

              <span>
                Super Admin
              </span>
            </button>
          )}
        </nav>
      </main>
    </div>
  );

}


function BillingPlanModal(
  props:{
    workspaceType:WorkspaceType;
    currentAccessPlan:string;
    currentBillingPlan:BillingPlan | null;
    pendingPlan:BillingPlan | null;
    billingStatus:string;
    checkoutUrl:string | null;
    canManage:boolean;
    busyPlan:BillingPlan | null;
    error:string;
    close:() => void;
    selectPlan:(plan:BillingPlan) => void;
  },
){

  const recurringBillingAvailable =
    Boolean(
      props.currentBillingPlan
      &&
      [
        "ACTIVE",
        "SCHEDULED",
        "RETRYING",
      ].includes(
        props.billingStatus,
      ),
    );


  return (
    <div
      className="billingModalBackdrop"
      role="presentation"
      onMouseDown={
        (event) => {

          if(
            event.target
            ===
            event.currentTarget
          ){
            props.close();
          }

        }
      }
    >
      <section
        className="billingModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-modal-title"
      >
        <header className="billingModalHeader">
          <div>
            <span>
              MyPocket AI subscription
            </span>

            <h2 id="billing-modal-title">
              Choose the right plan
            </h2>

            <p>
              Your current access is{" "}
              <strong>
                {billingPlanLabel(
                  props.currentAccessPlan,
                )}
              </strong>.
            </p>
          </div>

          <button
            type="button"
            className="billingModalClose"
            aria-label="Close subscription manager"
            onClick={props.close}
          >
            ×
          </button>
        </header>

        {props.pendingPlan && (
          <div className="billingPendingNotice">
            <strong>
              Plan change scheduled
            </strong>

            <span>
              {billingPlanLabel(
                props.pendingPlan,
              )} will become active after the next successful billing cycle.
            </span>
          </div>
        )}

        {!props.canManage && (
          <div className="billingOwnerNotice">
            Only the workspace Owner can purchase or change a subscription.
          </div>
        )}

        {props.error && (
          <div
            className="billingModalError"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            {props.error}
          </div>
        )}

        <div className="billingPlanGrid">
          {BILLING_PLAN_OPTIONS.map(
            (
              option,
            ) => {

              const isPending =
                props.pendingPlan
                === option.plan;

              const isCurrentBilling =
                props.currentBillingPlan
                === option.plan;

              const isCurrentAccess =
                props.currentAccessPlan
                === option.plan;

              const personalProBlocked =
                option.plan
                  === "PERSONAL_PRO"
                &&
                props.workspaceType
                  === "FAMILY";

              const continueCheckout =
                Boolean(
                  isCurrentBilling
                  &&
                  props.checkoutUrl
                  &&
                  [
                    "CHECKOUT_PENDING",
                    "PENDING",
                  ].includes(
                    props.billingStatus,
                  ),
                );

              const activeBillingPlan =
                isCurrentBilling
                &&
                props.billingStatus
                  === "ACTIVE";

              const disabled =
                !props.canManage
                ||
                Boolean(
                  props.busyPlan,
                )
                ||
                isPending
                ||
                activeBillingPlan
                ||
                (
                  isCurrentAccess
                  &&
                  !props.currentBillingPlan
                )
                ||
                personalProBlocked;


              let buttonLabel =
                "Choose plan";


              if(props.busyPlan === option.plan){

                buttonLabel =
                  "Processing...";

              }else if(isPending){

                buttonLabel =
                  "Scheduled";

              }else if(continueCheckout){

                buttonLabel =
                  "Continue payment";

              }else if(activeBillingPlan){

                buttonLabel =
                  "Current billing plan";

              }else if(
                isCurrentAccess
                &&
                !props.currentBillingPlan
              ){

                buttonLabel =
                  "Current plan";

              }else if(personalProBlocked){

                buttonLabel =
                  "Unavailable for Family";

              }else if(recurringBillingAvailable){

                buttonLabel =
                  "Switch next cycle";

              }


              return (
                <article
                  className={
                    [
                      "billingPlanCard",
                      isCurrentAccess
                        ? "current"
                        : "",
                      isPending
                        ? "pending"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  key={option.plan}
                >
                  <div className="billingPlanCardTop">
                    <div>
                      <span className="billingPlanName">
                        {option.name}
                      </span>

                      <strong>
                        {option.price}
                      </strong>
                    </div>

                    {isCurrentAccess && (
                      <span className="billingPlanBadge">
                        Current
                      </span>
                    )}

                    {isPending && (
                      <span className="billingPlanBadge pending">
                        Next cycle
                      </span>
                    )}
                  </div>

                  <p>
                    {option.description}
                  </p>

                  <button
                    type="button"
                    disabled={
                      disabled
                    }
                    onClick={() =>
                      props.selectPlan(
                        option.plan,
                      )
                    }
                  >
                    {buttonLabel}
                  </button>
                </article>
              );

            },
          )}
        </div>

        <footer className="billingModalFooter">
          <span>
            Payments are processed securely by HitPay.
          </span>

          <span>
            Plan changes for an active subscription take effect on the next successful billing cycle.
          </span>
        </footer>
      </section>
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
          <div
            className="qrState"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            Sedang dapatkan QR daripada Evolution...
          </div>
        )}

        {props.qr.error && !props.qr.loading && (
          <div
            className="qrState warning"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
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
          <div
            className="qrState warning"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <strong>QR expired.</strong>
            <span>Generate QR baru sebelum scan untuk elak QR lama digunakan.</span>
          </div>
        )}

        {props.qr.expiresAt && !props.qr.loading && (
          <div
            className={expired ? "qrTimer expired" : "qrTimer"}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
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
      <span className="brandMark brandMarkImage">
        <img
          src="/mypocket-logo.png?v=3"
          alt="MyPocket AI logo"
        />
      </span>
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
