import { AppIcon } from "./app-icon";
import { AdminUserManagement } from "./admin-user-management";
import { PromoCodeSettings } from "./promo-code-settings";
import { PromoQuoteDisclosure } from "./promo-quote-disclosure";
import { BillingSettingsPanel } from "./billing-settings-panel";
import {
  ChipBillingPlanModal,
  resolveChipAccessPlan,
  type ChipBillingInterval,
  type ChipBillingPlan,
  type ChipRenewalMethod,
} from "./chip-billing-plan-modal";
import {
  dashboardDateInputValue,
  resolveDashboardDateRange,
  transactionMatchesDashboardRange,
} from "./dashboard-analytics";
import type {
  DashboardDateRange as TransactionFilterRange,
  DashboardTransactionFilterMode as TransactionFilterMode,
} from "./dashboard-analytics";
import { PremiumDashboard } from "./premium-dashboard";
import { PublicLandingPage } from "./public-landing";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./public-landing.css";
import "./setup-wizard.css";
import "./system-theme.css";
import "./financial-focus.css";

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

function buildWhatsAppBotUrl(
  phoneNumber:string | null | undefined,
){
  const normalizedPhoneNumber = String(
    phoneNumber
    ??
    "",
  ).replace(
    /\D/g,
    "",
  );

  if(!normalizedPhoneNumber){
    return null;
  }

  return `https://wa.me/${
    normalizedPhoneNumber
  }?text=${
    encodeURIComponent("!")
  }`;
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

type WorkspaceOption = {
  id:string;
  name:string;
  type:WorkspaceType;
  role:MemberRole;
};

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
  receiptReference?:string | null;
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
    billingInterval:ChipBillingInterval;
    renewalMethod:ChipRenewalMethod;
    accessState:string;
    paidThroughAt:string | null;
    nextRenewalAt:string | null;
    paymentDueAt:string | null;
    graceEndsAt:string | null;
    autoRenewEnabled:boolean;
    cancelAtPeriodEnd:boolean;
  } | null;
  renewalHistory:Array<{
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
  workspaces:WorkspaceOption[];
  billing:BillingSubscriptionData | null;
  google:any | null;
  whatsapp:any | null;
  members:Member[];
  adminUsers:AdminUser[];
  transactions:Transaction[];
  commitments:CommitmentListData | null;
  botSettings:BotSettingsData | null;
};

type DashboardNotification = {
  id:string;
  title:string;
  message:string;
  level:
    | "info"
    | "warning"
    | "critical";
  view:DashboardView;
};


const BILLING_PLAN_OPTIONS:Array<{
  plan:BillingPlan;
  name:string;
  amount:number;
  price:string;
  description:string;
}> = [
  {
    plan:
      "PERSONAL_PRO",

    name:
      "Personal Pro",

    amount:
      9,

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

    amount:
      19,

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

    amount:
      49,

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


function billingPlanAmount(
  plan:string | null | undefined,
){

  return BILLING_PLAN_OPTIONS
    .find(
      (option) =>
        option.plan === plan,
    )
    ?.amount
    ??
    0;

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


  if(status === "PLAN_CHANGE_PAYMENT_PENDING"){
    return "Upgrade payment pending";
  }


  if(status === "PLAN_CHANGE_REVIEW_REQUIRED"){
    return "Payment review required";
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

function transactionDateInputValue(
  date:Date,
  timeZone = "Asia/Kuala_Lumpur",
){
  return dashboardDateInputValue(
    date,
    timeZone,
  );

}


function resolveTransactionFilterRange(
  mode:TransactionFilterMode,
  customFrom:string,
  customTo:string,
  timeZone = "Asia/Kuala_Lumpur",
  referenceDate:Date = new Date(),
):TransactionFilterRange {
  return resolveDashboardDateRange(
    mode,
    customFrom,
    customTo,
    timeZone,
    referenceDate,
  );

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
    receiptReference:"Receipt reference",
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
    delete:"Delete",
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
    receiptReference:"Rujukan resit",
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
    delete:"Padam",
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
  timeZone = "Asia/Kuala_Lumpur",
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

            timeZone,
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
        range.end.getTime() - 1,
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
  return transactionMatchesDashboardRange(
    transaction,
    range,
  );

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

function initialDashboardToken(){

  const hash =
    new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );

  const callbackToken =
    hash.get("auth") === "google"
      ? hash.get("token")
      : null;

  return callbackToken
    ||
    stored(STORAGE.token);

}

function isStoredTrue(key:string){
  return localStorage.getItem(key) === "true";
}

function money(value:unknown, currency = "MYR"){
  const raw =
    String(value ?? "")
      .replace(/,/g, "");

  const match =
    raw.match(
      /([0-9]+(?:\.[0-9]{1,2})?)/,
    );

  const amount =
    Number(
      match?.[1]
      ??
      raw
      ??
      0,
    );

  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  return `${currency} ${safeAmount.toFixed(2)}`;
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
    ||
    host === "localhost"
    ||
    host === "127.0.0.1"
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
    return <PublicLandingPage />;
  }

  const [token, setToken] =
    useState(
      initialDashboardToken,
    );

  const [termsAccepted, setTermsAccepted] =
    useState(
      false,
    );

  const [onboardingCompleted, setOnboardingCompleted] =
    useState(
      false,
    );

  const [wizardRequested, setWizardRequested] =
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
      workspaces:[],
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

        localStorage.removeItem(
          STORAGE.invite,
        );

        if(inviteResult.token){
          localStorage.setItem(
            STORAGE.token,
            nextToken,
          );
        }

        if(cancelled){
          window.location.replace(
            "/#dashboard",
          );
          return;
        }

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

    const isBillingReturn =
      window.location.pathname
        .startsWith("/billing/")
      && window.location.pathname
        .endsWith("/return");

    if(isBillingReturn){
      const returnStatus =
        new URLSearchParams(
          window.location.search,
        )
          .get("status")
          ?.trim()
          .toLowerCase()
        ??
        "";

      const paymentCanceled =
        [
          "cancelled",
          "canceled",
          "cancel",
        ].includes(
          returnStatus,
        );

      const paymentFailed =
        [
          "failed",
          "failure",
          "declined",
        ].includes(
          returnStatus,
        );

      setNotice(
        paymentCanceled
          ? "Payment was cancelled. No subscription access was activated."
          : paymentFailed
            ? "Payment was not completed. You can retry safely from subscription settings."
            : "Payment attempt received. MyPocket is verifying CHIP's signed confirmation before activating access.",
      );

      window.history.replaceState(
        null,
        document.title,
        "/#dashboard",
      );

      if(token){
        loadAll(
          token,
        );
      }

      return;
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

      if(!stored(STORAGE.invite)){
        loadAll(
          authToken
          ??
          token,
        );
      }

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

      let requestToken =
        activeToken;


      let me =
        await api<any>(
          "/auth/me",
          requestToken,
        );


      if(
        me?.recoveredWorkspace
        &&
        me?.sessionToken
      ){

        requestToken =
          me.sessionToken;

        localStorage.setItem(
          STORAGE.token,
          requestToken,
        );

        setToken(
          requestToken,
        );

        me =
          await api<any>(
            "/auth/me",
            requestToken,
          );

      }


      const [
        workspaces,
        billing,
        googleSettingsResult,
        whatsapp,
        members,
        sheetTransactionsResult,
        commitments,
        botSettings,
      ] =
        await Promise.all([
          api<WorkspaceOption[]>(
            "/workspace/all",
            requestToken,
          ),
          optionalApi<BillingSubscriptionData | null>(
            "/billing/subscription",
            requestToken,
            null,
          ),
          api<any | null>(
            "/google/settings",
            requestToken,
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
          optionalApi<any | null>("/whatsapp/status", requestToken, null),
          optionalApi<Member[]>("/whatsapp/members", requestToken, []),
          api<any>(
            "/transactions/sheet",
            requestToken,
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
          optionalApi<CommitmentListData | null>("/commitments?status=unpaid", requestToken, null),
          optionalApi<BotSettingsData | null>("/bot-settings", requestToken, null),
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
            requestToken,
            [],
          );

      }else{

        throw sheetTransactionsResult.error;

      }


      const adminUsers =
        me?.isSuperAdmin          ? await api<AdminUser[]>(
            "/workspace/admin/users",
            requestToken,
          )
          : [];

      setData({
        health,
        me,
        workspaces:
          listFrom<WorkspaceOption>(
            workspaces,
          ),
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

    if(
      pendingInviteToken
      ||
      stored(STORAGE.invite)
    ){
      return;
    }

    loadAll();

  }, [
    token,
    pendingInviteToken,
  ]);

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

  async function switchWorkspace(
    nextWorkspaceId:string,
  ){

    if(
      !token
      ||
      !nextWorkspaceId
      ||
      nextWorkspaceId === data.me?.workspace?.id
    ){
      return;
    }

    setState({
      loading:true,
      error:null,
    });

    try{

      const result =
        await api<{
          token:string;
          workspaceId:string;
          role:MemberRole;
        }>(
          `/workspace/${encodeURIComponent(nextWorkspaceId)}/switch`,
          token,
          {
            method:
              "POST",
          },
        );

      localStorage.setItem(
        STORAGE.token,
        result.token,
      );

      setData((current) => ({
        ...current,
        me:null,
        billing:null,
        google:null,
        whatsapp:null,
        members:[],
        adminUsers:[],
        transactions:[],
        commitments:null,
        botSettings:null,
      }));

      setNotice(
        "Workspace switched successfully.",
      );

      setToken(
        result.token,
      );

    }catch(error){

      setState({
        loading:false,
        error:
          error instanceof Error
            ? error.message
            : "Workspace switch failed.",
      });

    }

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
      setWizardRequested(false);
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
    setWizardRequested(true);
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
            credentials:
              "include",

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
    (
      wizardRequested
      ||
      (
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
        )
      )
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
      <main className="workspaceLoadingScreen">
        <section
          className="workspaceLoadingCard"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="workspaceLoadingMascot" aria-hidden="true">
            <span className="workspaceLoadingHalo" />
            <img
              src="/mypocket-robot-wave.webp?v=1"
              alt=""
            />
          </div>

          <div className="workspaceLoadingContent">
            <LogoBlock />
            <h1>Sedang menyediakan workspace anda</h1>
            <p>
              MyPocket sedang menyemak tetapan dan sambungan anda.
              Hanya seketika.
            </p>
            <div className="workspaceLoadingProgress" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <small>Data kewangan anda kekal selamat semasa proses ini.</small>
          </div>
        </section>
      </main>
    );

  }

  if(!token){

    return (
      <TokenGate />
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
      switchWorkspace={switchWorkspace}
      signOut={signOut}
    />
  );

}

function TokenGate(){

  return (
    <main className="loginScreen">
      <section className="loginCard">
        <div className="loginContent">
          <LogoBlock />

          <h1>Selamat kembali.</h1>
          <p>
            Log masuk untuk membuka workspace dan meneruskan rekod kewangan
            anda bersama MyPocket AI.
          </p>

          <div className="loginTrustNote">
            <span aria-hidden="true">✓</span>
            <small>
              Google hanya berkongsi nama dan alamat e-mel anda semasa log
              masuk. Akses Sheet dan Drive diminta kemudian dengan jelas.
            </small>
          </div>

          <a
            className="googleButton"
            href={googleLoginUrl()}
          >
            <span aria-hidden="true">G</span>
            Log masuk dengan Google
          </a>
        </div>

        <picture className="loginMascotPicture">
          <source
            media="(max-width: 720px)"
            srcSet="/mypocket-mascot-login-mobile.png?v=1"
          />
          <img
            className="loginMascot"
            src="/mypocket-login-mascot-safe-v3.png?v=1"
            alt="Maskot MyPocket AI bersandar pada peti keselamatan dan menunjukkan butang log masuk Google"
          />
        </picture>
      </section>
    </main>
  );

}

type WizardStepId =
  | "welcome"
  | "google"
  | "workspace"
  | "whatsapp"
  | "finish";

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

  const wizardSteps:Array<{
    id:WizardStepId;
    label:string;
    description:string;
  }> = [
    {
      id:"welcome",
      label:"Mula",
      description:"Kenali MyPocket AI",
    },
    {
      id:"google",
      label:"Google",
      description:"Sambungkan Sheet & Drive",
    },
    {
      id:"workspace",
      label:"Ruang kewangan",
      description:"Semak ruang & akses",
    },
    {
      id:"whatsapp",
      label:"WhatsApp",
      description:"Sambungkan bot",
    },
    {
      id:"finish",
      label:"Sedia digunakan",
      description:"Semak dan mula",
    },
  ];

  function normalizedStepId(value:string):WizardStepId{
    const target = value.trim().toLowerCase();

    if(target === "google") return "google";
    if(target === "whatsapp") return "whatsapp";
    if(["workspace", "members", "subscription"].includes(target)){
      return "workspace";
    }
    if(target === "finish") return "finish";
    return "welcome";
  }

  const [step, setStep] = useState(() => {
    const initialId = normalizedStepId(
      props.preferredStep || stored(STORAGE.wizardStep),
    );
    return wizardSteps.findIndex((item) => item.id === initialId);
  });

  const currentStep = wizardSteps[step] || wizardSteps[0];
  const progress = (step / (wizardSteps.length - 1)) * 100;
  const minutesLeft = Math.max(0, 4 - step);

  useEffect(() => {
    if(!props.preferredStep) return;
    const target = normalizedStepId(props.preferredStep);
    const index = wizardSteps.findIndex((item) => item.id === target);
    if(index >= 0) setStep(index);
  }, [props.preferredStep]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE.wizardStep,
      currentStep.id,
    );
  }, [currentStep.id]);

  const googleTechnicalMessage =
    /google|refresh token|spreadsheet|sheet/i.test(
      `${props.notice} ${props.state.error || ""}`,
    );

  const generalNotice =
    props.notice && !googleTechnicalMessage
      ? props.notice === "Terms accepted."
        ? "Persetujuan anda telah disimpan."
        : props.notice
      : "";

  function stepIsDone(id:WizardStepId){
    if(id === "welcome") return props.termsAccepted;
    if(id === "google") return hasGoogleSheet;
    if(id === "workspace") return Boolean(props.data.me?.workspace);
    if(id === "whatsapp") return whatsappReady;
    return setupReady;
  }

  function stepStatus(id:WizardStepId, index:number){
    if(props.state.loading && index === step) return "Sedang diperiksa";
    if(index === step) return "Sedang disediakan";
    return stepIsDone(id) ? "Berjaya" : "Belum dibuat";
  }

  function goTo(id:WizardStepId){
    const index = wizardSteps.findIndex((item) => item.id === id);
    if(index >= 0) setStep(index);
  }

  function next(){
    setStep((current) => Math.min(current + 1, wizardSteps.length - 1));
  }

  function back(){
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleFinishAction(){
    if(!props.termsAccepted){
      goTo("welcome");
      return;
    }
    if(!hasGoogleSheet){
      goTo("google");
      return;
    }
    if(whatsappRequired && !hasWhatsApp){
      goTo("whatsapp");
      return;
    }
    props.finishOnboarding();
  }

  async function recordFirstTransaction(){
    if(!setupReady){
      handleFinishAction();
      return;
    }
    await props.finishOnboarding();
    window.location.hash = "#transactions";
  }

  const planLabels:Record<string, string> = {
    PERSONAL:"Personal Pro",
    FAMILY:"Family",
    BUSINESS:"Business / Company",
  };

  return (
    <main className="wizardShell">
      <section className="wizardPanel">
        <div className="wizardSide">
          <div className="wizardBrand">
            <img src="/mypocket-mark.png" alt="" />
            <strong>MyPocket AI</strong>
          </div>
          <h1>Sediakan<br />MyPocket anda</h1>

          <nav className="stepList" aria-label="Langkah penyediaan">
            {wizardSteps.map((item, index) => {
              const done = stepIsDone(item.id);
              const active = index === step;
              return (
              <button
                className={`step${active ? " active" : ""}${done ? " done" : ""}`}
                onClick={() => setStep(index)}
                key={item.id}
                aria-current={active ? "step" : undefined}
              >
                <span className="stepNumber">{done && !active ? "✓" : index + 1}</span>
                <span className="stepCopy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <span className="stepState">{stepStatus(item.id, index)}</span>
              </button>
              );
            })}
          </nav>

          <div className="wizardMascot" aria-hidden="true">
            <img src="/mypocket-robot-wave.webp" alt="" />
          </div>
        </div>

        <div className="wizardMain">
          <header className="wizardMobileHeader">
            <div className="wizardBrand">
              <img src="/mypocket-mark.png" alt="" />
              <strong>MyPocket AI</strong>
            </div>
          </header>

          <div className="wizardProgressSummary">
            <span>Langkah {step + 1} daripada {wizardSteps.length}</span>
            <span>
              {minutesLeft > 0
                ? `lebih kurang ${minutesLeft} minit lagi`
                : "semakan terakhir"}
            </span>
          </div>

          <div className="wizardMobileProgress" aria-hidden="true">
            <span className="wizardProgressFill" style={{width:`${progress}%`}} />
            {wizardSteps.map((item, index) => {
              const completed = index < step && stepIsDone(item.id);
              const visitedPending = index < step && !completed;
              return (
                <span
                  className={
                    `wizardProgressNode${completed || index === step ? " active" : ""}`
                    + `${visitedPending ? " visited" : ""}`
                  }
                  key={item.id}
                >
                  {completed ? "✓" : index + 1}
                </span>
              );
            })}
          </div>

          {generalNotice && (
            <div className="wizardInlineNotice" role="status" aria-live="polite">
              {generalNotice}
            </div>
          )}

          {currentStep.id === "google" && !hasGoogleSheet && (
            <div className="wizardInlineNotice" role="status" aria-live="polite">
              <strong>Google belum disambungkan.</strong>
              <span>
                Sambungkan akaun Google untuk menyediakan Sheet dan Drive anda.
              </span>
              {(googleTechnicalMessage || props.state.error) && (
                <small>Tiada data diubah. Anda boleh cuba semula dengan selamat.</small>
              )}
            </div>
          )}

          <section className="wizardContent" key={currentStep.id}>
            {currentStep.id === "welcome" && (
              <>
                <div className="wizardWelcomeIntro">
                  <div>
                    <h2>Jom sediakan MyPocket anda</h2>
                    <p>
                      Kami akan bantu anda sambungkan Google, semak ruang kewangan,
                      dan sediakan WhatsApp supaya semuanya terus boleh digunakan.
                    </p>
                    <span className="wizardTime">
                      <WizardFeatureIcon name="clock" />
                      Hanya 3–5 minit
                    </span>
                  </div>
                  <img
                    className="wizardWelcomeMascot"
                    src="/mypocket-mark.png"
                    alt="Maskot MyPocket AI tersenyum"
                  />
                </div>

                <div className="wizardFeatureList">
                  <WizardFeature
                    icon="shield"
                    title="Selamat & peribadi"
                    text="Data kewangan kekal di akaun Google anda sendiri."
                  />
                  <WizardFeature
                    icon="sync"
                    title="Sentiasa terkini"
                    text="Sheet, Drive dan dashboard diselaraskan secara automatik."
                  />
                  <WizardFeature
                    icon="folder"
                    title="Mudah diakses"
                    text="Rekod kewangan boleh dicapai bila-bila masa."
                  />
                </div>

                <label className={`wizardTerms${props.termsAccepted ? " accepted" : ""}`}>
                  <input
                    type="checkbox"
                    checked={props.termsAccepted}
                    onChange={() => {
                      if(!props.termsAccepted) props.acceptTerms();
                    }}
                  />
                  <span>
                    Saya bersetuju dengan <a href="/terms" target="_blank">Terma</a>
                    {" "}dan <a href="/privacy" target="_blank">Privasi</a> MyPocket AI.
                  </span>
                </label>

                <div className="wizardActionRow single">
                  <button
                    className="wizardPrimary"
                    onClick={next}
                    disabled={!props.termsAccepted}
                  >
                    Mulakan setup
                  </button>
                </div>
              </>
            )}

            {currentStep.id === "google" && (
              <>
                <h2>Sambungkan Google</h2>
                <p className="wizardLead">
                  MyPocket AI menggunakan Google Sheet untuk menyusun rekod kewangan
                  dan Google Drive untuk menyimpan resit serta dokumen anda.
                  <strong> Data anda kekal milik anda.</strong>
                </p>

                <div className="wizardFeatureList compact">
                  <WizardFeature
                    icon="shield"
                    title="Selamat & peribadi"
                    text="Kami hanya meminta akses yang diperlukan."
                  />
                  <WizardFeature
                    icon="sync"
                    title="Sentiasa terkini"
                    text="Perubahan diselaraskan merentas peranti anda."
                  />
                  <WizardFeature
                    icon="folder"
                    title="Sheet & Drive siap untuk anda"
                    text="Template, folder resit dan laporan disediakan automatik."
                  />
                </div>

                {hasGoogleSheet ? (
                  <div className="wizardSuccessCard">
                    <WizardFeatureIcon name="check" />
                    <div>
                      <strong>Google sudah disambungkan</strong>
                      <span>{props.data.google?.spreadsheetTitle || "Google Sheet MyPocket anda"}</span>
                    </div>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${props.data.google?.spreadsheetId}`}
                      target="_blank"
                    >
                      Buka Sheet
                    </a>
                  </div>
                ) : (
                  <div className="wizardTrustNote">
                    <WizardFeatureIcon name="lock" />
                    <div>
                      <strong>Akses fail khusus sahaja</strong>
                      <span>
                        MyPocket tidak meminta akses ke seluruh Google Drive.
                        Hanya fail MyPocket yang anda pilih atau cipta, dan akses
                        boleh dicabut pada bila-bila masa.
                      </span>
                    </div>
                  </div>
                )}

                <div className="wizardActionRow">
                  <button className="wizardBack" onClick={back}>Kembali</button>
                  <button
                    className="wizardPrimary"
                    onClick={hasGoogleSheet ? next : props.connectGoogleSheet}
                  >
                    {!hasGoogleSheet && <span className="wizardGoogleMark">G</span>}
                    {hasGoogleSheet ? "Teruskan" : "Sambungkan akaun Google"}
                  </button>
                </div>
                {!hasGoogleSheet && (
                  <button className="wizardSkip" onClick={next}>Buat kemudian</button>
                )}
              </>
            )}

            {currentStep.id === "workspace" && (
              <>
                <h2>Ruang kewangan anda</h2>
                <p className="wizardLead">
                  Semak ruang yang akan digunakan. Tetapan ini menentukan cara ahli,
                  transaksi dan WhatsApp diuruskan.
                </p>

                <div className="wizardWorkspaceSummary">
                  <span>Ruang semasa</span>
                  <strong>{props.data.me?.workspace?.name || "MyPocket Workspace"}</strong>
                  <small>Peranan anda: {props.data.me?.workspace?.role || "OWNER"}</small>
                </div>

                <div className="wizardPlanChoices" aria-label="Jenis ruang kewangan">
                  {[
                    ["PERSONAL", "Personal Pro", "Kewangan peribadi & automasi AI"],
                    ["FAMILY", "Family", "Rekod dikongsi bersama keluarga"],
                    ["BUSINESS", "Business", "Kawalan pasukan & laporan lengkap"],
                  ].map(([id, label, description]) => (
                    <div
                      className={`wizardPlanChoice${workspaceType === id ? " selected" : ""}`}
                      key={id}
                      aria-current={workspaceType === id ? "true" : undefined}
                    >
                      <WizardFeatureIcon
                        name={id === "PERSONAL" ? "wallet" : id === "FAMILY" ? "people" : "building"}
                      />
                      <strong>{label}</strong>
                      <span>{description}</span>
                      {workspaceType === id && <small>Pelan semasa</small>}
                    </div>
                  ))}
                </div>

                {isShared && (
                  <div className="wizardMemberSummary">
                    <WizardFeatureIcon name="people" />
                    <div>
                      <strong>{props.data.members.length} ahli dalam ruang ini</strong>
                      <span>{linked} nombor WhatsApp sudah dipautkan.</span>
                    </div>
                  </div>
                )}

                <p className="wizardFootnote">
                  Jenis ruang dan ahli boleh diuruskan kemudian melalui Settings.
                </p>

                <div className="wizardActionRow">
                  <button className="wizardBack" onClick={back}>Kembali</button>
                  <button className="wizardPrimary" onClick={next}>Teruskan ke WhatsApp</button>
                </div>
              </>
            )}

            {currentStep.id === "whatsapp" && (
              <>
                <h2>{hasWhatsApp ? "WhatsApp sudah sedia" : "Sambungkan WhatsApp"}</h2>
                <p className="wizardLead">
                  {hasWhatsApp
                    ? "Bot MyPocket sudah boleh menerima arahan dan resit daripada WhatsApp anda."
                    : "Imbas kod QR untuk merekod transaksi, resit dan voice note terus daripada WhatsApp."}
                </p>

                <div className={`wizardConnectionCard${hasWhatsApp ? " connected" : ""}`}>
                  <WizardFeatureIcon name="message" />
                  <div>
                    <span>Status sambungan</span>
                    <strong>{hasWhatsApp ? "Berjaya disambungkan" : "Belum disambungkan"}</strong>
                    <small>
                      {hasWhatsApp
                        ? props.data.whatsapp?.instance?.instanceName || "Bot MyPocket AI"
                        : "Gunakan nombor yang akan menjadi bot MyPocket."}
                    </small>
                  </div>
                  <button className="wizardTextButton" onClick={props.refresh}>
                    Semak semula
                  </button>
                </div>

                {!hasWhatsApp && (
                  <ol className="wizardInstructions">
                    <li>Buka WhatsApp dan pilih <strong>Linked devices</strong>.</li>
                    <li>Tekan <strong>Link a device</strong>.</li>
                    <li>Imbas QR yang MyPocket paparkan.</li>
                  </ol>
                )}

                {!hasWhatsApp && props.whatsAppQr.open && props.whatsAppQr.mode === "wizard" && (
                  <WhatsAppQrPanel
                    qr={props.whatsAppQr}
                    secondsLeft={props.qrSecondsLeft}
                    mascot
                    openQr={() => props.openWhatsAppQr("wizard")}
                    resetQr={() => props.resetWhatsAppInstance("wizard")}
                    closeQr={props.closeWhatsAppQr}
                  />
                )}

                <div className="wizardActionRow">
                  <button className="wizardBack" onClick={back}>Kembali</button>
                  <button
                    className="wizardPrimary"
                    onClick={hasWhatsApp ? next : () => props.openWhatsAppQr("wizard")}
                  >
                    {hasWhatsApp ? "Teruskan" : "Paparkan kod QR"}
                  </button>
                </div>

                {!hasWhatsApp && (
                  <div className="wizardSecondaryLinks">
                    <button className="wizardSkip" onClick={next}>
                      {whatsappRequired ? "Sediakan kemudian" : "Buat kemudian"}
                    </button>
                    <button className="wizardSkip" onClick={() => props.resetWhatsAppInstance("wizard")}>
                      Jana QR baharu
                    </button>
                  </div>
                )}
              </>
            )}

            {currentStep.id === "finish" && (
              <>
                <div className="wizardFinishHeading">
                  <span className={`wizardFinishIcon${setupReady ? " ready" : ""}`}>
                    <WizardFeatureIcon name={setupReady ? "check" : "clock"} />
                  </span>
                  <div>
                    <h2>{setupReady ? "MyPocket anda sudah sedia" : "Hampir siap"}</h2>
                    <p className="wizardLead">
                      {setupReady
                        ? "Semua perkara penting telah disediakan. Anda boleh mula merekod sekarang."
                        : "Lengkapkan perkara wajib di bawah sebelum membuka dashboard."}
                    </p>
                  </div>
                </div>

                <div className="wizardReviewList">
                  {[
                    ["welcome", "Terma & Privasi", props.termsAccepted],
                    ["google", "Google Sheet & Drive", hasGoogleSheet],
                    ["workspace", `Ruang ${planLabels[workspaceType] || workspaceType}`, true],
                    ["whatsapp", "Bot WhatsApp", whatsappReady],
                  ].map(([id, label, done]) => (
                    <button key={String(id)} onClick={() => goTo(id as WizardStepId)}>
                      <span className={done ? "done" : "pending"}>{done ? "✓" : "•"}</span>
                      <strong>{String(label)}</strong>
                      <small>{done ? "Berjaya" : "Belum dibuat"}</small>
                    </button>
                  ))}
                </div>

                <div className="wizardActionRow finish">
                  <button className="wizardBack" onClick={back}>Kembali</button>
                  <button className="wizardPrimary" onClick={handleFinishAction}>
                    {setupReady ? "Buka dashboard" : "Lengkapkan setup"}
                  </button>
                </div>

                {setupReady && (
                  <div className="wizardFinishExtras">
                    <button className="wizardSkip" onClick={recordFirstTransaction}>
                      Rekod transaksi pertama
                    </button>
                    <button className="wizardSkip" onClick={props.installApp}>
                      Pasang aplikasi di telefon
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {props.state.error && !googleTechnicalMessage && (
            <div
              className="wizardError"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              Sesuatu belum berjaya diselesaikan. Semak sambungan anda dan cuba lagi.
            </div>
          )}
        </div>
      </section>
    </main>
  );

}

type WizardIconName =
  | "shield"
  | "sync"
  | "folder"
  | "clock"
  | "lock"
  | "check"
  | "wallet"
  | "people"
  | "building"
  | "message";

function WizardFeatureIcon(props:{name:WizardIconName}){
  const common = {
    fill:"none",
    stroke:"currentColor",
    strokeWidth:1.9,
    strokeLinecap:"round" as const,
    strokeLinejoin:"round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {props.name === "shield" && <path d="M12 3 5.5 5.7v5.5c0 4.2 2.7 7.8 6.5 9.8 3.8-2 6.5-5.6 6.5-9.8V5.7L12 3Zm-2.2 9.1 1.5 1.5 3.3-3.5" />}
      {props.name === "sync" && <path d="M20 7v5h-5M4 17v-5h5m9.6-3.2A7.5 7.5 0 0 0 6.2 6.5L4 9m16 6-2.2 2.5A7.5 7.5 0 0 1 5.4 15.2" />}
      {props.name === "folder" && <path d="M3.5 6.5h6l2 2h9v9.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V6.5Zm0 4h17" />}
      {props.name === "clock" && <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>}
      {props.name === "lock" && <><rect x="5.5" y="10" width="13" height="10" rx="2" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10m-3.5 4v2" /></>}
      {props.name === "check" && <><circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.6 2.6 5.5-5.8" /></>}
      {props.name === "wallet" && <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-10Z" /><path d="M4 9h16m-5 4h5" /></>}
      {props.name === "people" && <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /><path d="M3.5 19c.3-3.5 2.2-5.5 5.5-5.5s5.2 2 5.5 5.5m.2-4.6c2.9-.2 4.8 1.5 5 4.6" /></>}
      {props.name === "building" && <><path d="M5 21V5l7-2v18M12 8h7v13M8 8v1m0 3v1m0 3v1m7-5v1m0 3v1M3 21h18" /></>}
      {props.name === "message" && <><path d="M4 5.5h16v11H9l-5 4v-15Z" /><path d="M8 10h8m-8 3h5" /></>}
    </svg>
  );
}

function WizardFeature(
  props:{
    icon:WizardIconName;
    title:string;
    text:string;
  },
){
  return (
    <div className="wizardFeature">
      <span className="wizardFeatureIcon"><WizardFeatureIcon name={props.icon} /></span>
      <div>
        <strong>{props.title}</strong>
        <span>{props.text}</span>
      </div>
    </div>
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
    switchWorkspace:(workspaceId:string) => Promise<void>;
    signOut:() => void;
  },
){

  const [activeView, setActiveView] =
    useState<DashboardView>(readDashboardViewFromHash);

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [mobileMoreOpen, setMobileMoreOpen] =
    useState(false);

  const mobileMoreSheetRef =
    useRef<HTMLElement | null>(null);

  const mobileMoreTriggerRef =
    useRef<HTMLButtonElement | null>(null);

  const [actionMessage, setActionMessage] =
    useState("");

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const notificationCloseTimerRef =
    useRef<number | null>(null);

  function cancelNotificationClose(){

    if(notificationCloseTimerRef.current === null){
      return;
    }

    window.clearTimeout(
      notificationCloseTimerRef.current,
    );

    notificationCloseTimerRef.current =
      null;

  }

  function scheduleNotificationClose(){

    cancelNotificationClose();

    notificationCloseTimerRef.current =
      window.setTimeout(() => {

        setNotificationOpen(false);

        notificationCloseTimerRef.current =
          null;

      }, 180);

  }

  useEffect(() => () => {

    cancelNotificationClose();

  }, []);

  useEffect(
    () => {
      if(!mobileMoreOpen){
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      const closeOnEscape =
        (event:KeyboardEvent) => {
          if(event.key === "Escape"){
            setMobileMoreOpen(false);
          }
        };

      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", closeOnEscape);
      window.requestAnimationFrame(() => {
        mobileMoreSheetRef.current?.focus();
      });

      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", closeOnEscape);
        mobileMoreTriggerRef.current?.focus();
      };
    },
    [mobileMoreOpen],
  );

  const [seenNotificationIds, setSeenNotificationIds] =
    useState<string[]>([]);

  const [ignoredNotificationIds, setIgnoredNotificationIds] =
    useState<string[]>([]);

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

  const dashboardTimeZone =
    props.data.botSettings?.timezone
    ||
    "Asia/Kuala_Lumpur";

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
          transactionDateInputValue(
            new Date(),
            dashboardTimeZone,
          );

        return `${current.slice(0, 7)}-01`;

      },
    );

  const [transactionCustomTo, setTransactionCustomTo] =
    useState(
      () =>
        transactionDateInputValue(
          new Date(),
          dashboardTimeZone,
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

  const legacyAccessPlan =
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

  const currentAccessPlan =
    resolveChipAccessPlan({
      billingPlan:currentBillingPlan,
      accessState:props.data.billing?.billing?.accessState,
      legacyPlan:legacyAccessPlan,
    });

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

  const isMemberRole =
    actorRole === "MEMBER";

  const canViewWorkspaceSettings =
    canChangeWorkspaceSettings ||
    isMemberRole;

  const canManageMembers =
    isSuperAdmin ||
    (
      isSharedWorkspace
      &&
      canChangeWorkspaceSettings
    );

  const canUseAdmin =
    canManageMembers;

  const shouldShowGoogleSheetAccessNotice =
    actorRole === "OWNER"
    &&
    isSharedWorkspace
    &&
    props.data.members.some(
      (member) =>
        member.role !== "OWNER",
    );

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
                : "Sheet ini belum sedia untuk MyPocket. Gunakan Auto Setup / Repair, atau pilih sheet MyPocket yang lain di Advanced Recovery."
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
          rootFolderUrl:
            legacyManualRootFolderUrl
              .trim(),

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
      dashboardTimeZone,
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
      dashboardTimeZone,
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

  const mobileWhatsAppUrl =
    isWhatsAppConnected
      ? buildWhatsAppBotUrl(
          props.data.whatsapp?.instance?.phoneNumber,
        )
      : null;

  const hasDashboardGoogleSheet =
    Boolean(
      props.data.google?.spreadsheetId,
    );

  const isDashboardSetupComplete =
    hasDashboardGoogleSheet
    &&
    isWhatsAppConnected;

  const notificationStorageKey =
    `imai_dashboard_notifications_seen:v1:${
      props.data.me?.user?.id
      ||
      "anonymous"
    }:${
      props.data.me?.workspace?.id
      ||
      "workspace"
    }`;

  const ignoredNotificationStorageKey =
    `imai_dashboard_notifications_ignored:v1:${
      props.data.me?.user?.id
      ||
      "anonymous"
    }:${
      props.data.me?.workspace?.id
      ||
      "workspace"
    }`;

  const dashboardNotifications =
    useMemo<DashboardNotification[]>(
      () => {

        const notifications:DashboardNotification[] =
          [];

        if(!props.data.health){

          notifications.push({
            id:
              "system:api-unavailable",
            title:
              dashboardLanguage === "ms"
                ? "Status API tidak tersedia"
                : "API status is unavailable",
            message:
              dashboardLanguage === "ms"
                ? "Refresh dashboard. Jika masalah berterusan, hubungi sokongan sistem."
                : "Refresh the dashboard. Contact system support if the issue continues.",
            level:
              "critical",
            view:
              "dashboard",
          });

        }

        if(shouldShowGoogleSheetAccessNotice){

          const memberSignature =
            props.data.members
              .filter(
                (member) =>
                  member.role !== "OWNER",
              )
              .map(
                (member) =>
                  member.userId,
              )
              .sort()
              .join(",");

          notifications.push({
            id:
              `permission:google-sheet-share:${memberSignature}`,
            title:
              dashboardLanguage === "ms"
                ? "Kebenaran Google Sheet"
                : "Google Sheet permission",
            message:
              dashboardLanguage === "ms"
                ? "Beri akses Viewer atau Editor kepada Admin/Member yang perlu membuka Google Sheet. Akses bot tidak terjejas."
                : "Grant Viewer or Editor access to Admins or Members who need to open the Google Sheet. Bot access is unaffected.",
            level:
              "warning",
            view:
              "admin",
          });

        }

        const latestTransaction =
          [...props.data.transactions]
            .sort(
              (left, right) =>
                new Date(
                  right.transactionDate,
                ).getTime()
                -
                new Date(
                  left.transactionDate,
                ).getTime(),
            )[0];

        if(latestTransaction){

          const transactionLabel =
            latestTransaction.merchant?.name
            ||
            latestTransaction.category?.name
            ||
            latestTransaction.description
            ||
            latestTransaction.type;

          notifications.push({
            id:
              `transaction:${latestTransaction.id}`,
            title:
              dashboardLanguage === "ms"
                ? "Transaksi terkini"
                : "Latest transaction",
            message:
              `${transactionLabel} · ${
                latestTransaction.currency
                ||
                "MYR"
              } ${Number(
                latestTransaction.amount
                ||
                0,
              ).toFixed(2)}`,
            level:
              "info",
            view:
              "transactions",
          });

        }

        if(
          canChangeWorkspaceSettings
          &&
          !hasDashboardGoogleSheet
        ){

          notifications.push({
            id:
              "system:google-sheet-disconnected",
            title:
              dashboardLanguage === "ms"
                ? "Google Sheet belum connected"
                : "Google Sheet is not connected",
            message:
              dashboardLanguage === "ms"
                ? "Owner/Admin perlu menyambungkan Google Sheet workspace."
                : "An Owner or Admin must connect the workspace Google Sheet.",
            level:
              "critical",
            view:
              "google",
          });

        }

        if(
          canChangeWorkspaceSettings
          &&
          props.data.whatsapp
          &&
          !isWhatsAppConnected
        ){

          notifications.push({
            id:
              `system:whatsapp:${
                props.data.whatsapp?.instance?.status
                ||
                "unknown"
              }`,
            title:
              dashboardLanguage === "ms"
                ? "WhatsApp tidak connected"
                : "WhatsApp is not connected",
            message:
              dashboardLanguage === "ms"
                ? "Semak status atau pair semula bot workspace."
                : "Check the status or pair the workspace bot again.",
            level:
              "critical",
            view:
              "whatsapp",
          });

        }

        return notifications;

      },
      [
        canChangeWorkspaceSettings,
        dashboardLanguage,
        hasDashboardGoogleSheet,
        isWhatsAppConnected,
        props.data.health,
        props.data.members,
        props.data.transactions,
        props.data.whatsapp,
        shouldShowGoogleSheetAccessNotice,
      ],
    );

  const visibleDashboardNotifications =
    dashboardNotifications
      .filter(
        (notification) =>
          !ignoredNotificationIds.includes(
            notification.id,
          ),
      );

  const unreadNotificationCount =
    visibleDashboardNotifications
      .filter(
        (notification) =>
          !seenNotificationIds.includes(
            notification.id,
          ),
      )
      .length;

  useEffect(
    () => {

      try{

        const storedIds =
          JSON.parse(
            localStorage.getItem(
              notificationStorageKey,
            )
            ||
            "[]",
          );

        setSeenNotificationIds(
          Array.isArray(storedIds)
            ? storedIds.filter(
              (value):value is string =>
                typeof value === "string",
            )
            : [],
        );

      }catch{

        setSeenNotificationIds([]);

      }

    },
    [
      notificationStorageKey,
    ],
  );

  useEffect(
    () => {

      try{

        const storedIds =
          JSON.parse(
            localStorage.getItem(
              ignoredNotificationStorageKey,
            )
            ||
            "[]",
          );

        setIgnoredNotificationIds(
          Array.isArray(storedIds)
            ? storedIds.filter(
              (value):value is string =>
                typeof value === "string",
            )
            : [],
        );

      }catch{

        setIgnoredNotificationIds([]);

      }

    },
    [
      ignoredNotificationStorageKey,
    ],
  );

  useEffect(
    () => {

      const currentIds =
        new Set(
          dashboardNotifications.map(
            (notification) =>
              notification.id,
          ),
        );

      setSeenNotificationIds(
        (current) => {

          const next =
            current.filter(
              (id) =>
                currentIds.has(id),
            );

          if(next.length === current.length){
            return current;
          }

          try{

            localStorage.setItem(
              notificationStorageKey,
              JSON.stringify(next),
            );

          }catch{

            // Notification read state is optional device-local data.

          }

          return next;

        },
      );

    },
    [
      dashboardNotifications,
      notificationStorageKey,
    ],
  );

  useEffect(
    () => {

      const currentIds =
        new Set(
          dashboardNotifications.map(
            (notification) =>
              notification.id,
          ),
        );

      setIgnoredNotificationIds(
        (current) => {

          const next =
            current.filter(
              (id) =>
                currentIds.has(id),
            );

          if(next.length === current.length){
            return current;
          }

          try{

            localStorage.setItem(
              ignoredNotificationStorageKey,
              JSON.stringify(next),
            );

          }catch{

            // Notification ignored state is optional device-local data.

          }

          return next;

        },
      );

    },
    [
      dashboardNotifications,
      ignoredNotificationStorageKey,
    ],
  );

  function markNotificationsSeen(){

    const notificationIds =
      visibleDashboardNotifications.map(
        (notification) =>
          notification.id,
      );

    setSeenNotificationIds(
      notificationIds,
    );

    try{

      localStorage.setItem(
        notificationStorageKey,
        JSON.stringify(notificationIds),
      );

    }catch{

      // Notification read state is optional device-local data.

    }

  }

  function markNotificationsUnread(){

    setSeenNotificationIds(
      [],
    );

    try{

      localStorage.setItem(
        notificationStorageKey,
        JSON.stringify([]),
      );

    }catch{

      // Notification read state is optional device-local data.

    }

  }

  function clearIgnoredNotifications(){

    setIgnoredNotificationIds(
      [],
    );

    try{

      localStorage.setItem(
        ignoredNotificationStorageKey,
        JSON.stringify([]),
      );

    }catch{

      // Notification ignored state is optional device-local data.

    }

  }

  function setNotificationReadState(
    notificationId:string,
    read:boolean,
  ){

    setSeenNotificationIds(
      (current) => {

        const next =
          read
            ? Array.from(
              new Set([
                ...current,
                notificationId,
              ]),
            )
            : current.filter(
              (id) =>
                id !== notificationId,
            );

        try{

          localStorage.setItem(
            notificationStorageKey,
            JSON.stringify(next),
          );

        }catch{

          // Notification read state is optional device-local data.

        }

        return next;

      },
    );

  }

  function ignoreDashboardNotification(
    notificationId:string,
  ){

    setIgnoredNotificationIds(
      (current) => {

        const next =
          Array.from(
            new Set([
              ...current,
              notificationId,
            ]),
          );

        try{

          localStorage.setItem(
            ignoredNotificationStorageKey,
            JSON.stringify(next),
          );

        }catch{

          // Notification ignored state is optional device-local data.

        }

        return next;

      },
    );

    setNotificationReadState(
      notificationId,
      true,
    );

  }

  function openDashboardNotification(
    notification:DashboardNotification,
  ){

    setNotificationReadState(
      notification.id,
      true,
    );

    setNotificationOpen(false);
    goToView(notification.view);

  }

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

  async function deleteCommitment(
    id:string,
    name:string,
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

    if(
      !window.confirm(
        `Delete commitment "${name}"? Tindakan ini akan padam commitment dan reminder history berkaitan.`,
      )
    ){
      return;
    }

    await api(
      `/commitments/${id}`,
      activeToken,
      { method:"DELETE" },
    );

    await reloadCommitments(
      commitmentFilter,
      "Commitment telah dipadam.",
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
    setMobileMoreOpen(false);

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

    const response =
      await api<{
        inviteUrl:string;
      }>(
        "/workspace/invites",
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
    setLinkEmail(newMemberEmail);
    setNewMemberRole("MEMBER");
    setInviteUrl(response.inviteUrl);
    setActionMessage("Invite link created. Share this link with the member.");
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
    selection:{
      plan:ChipBillingPlan;
      interval:ChipBillingInterval;
      renewalMethod:ChipRenewalMethod;
      preferredPaymentMethod?:string;
      promoCode?:string;
    },
  ){

    const plan = selection.plan;

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


    setBillingBusyPlan(
      plan,
    );

    setBillingError("");


    try{

      const result =
        await api<{
          checkoutUrl?:string;
          plan:ChipBillingPlan;
          reused?:boolean;
          scheduled?:boolean;
          effectiveAt?:string;
        }>(
          "/billing/checkout",
          token,
          {
            method:
              "POST",

              body:
                JSON.stringify({
                  ...selection,
                  requestId:
                    crypto.randomUUID(),
                }),
          },
        );

      if(result.scheduled){
        setActionMessage(`${billingPlanLabel(plan)} downgrade is scheduled after the current paid period.`);
        props.refresh();
      }else if(result.checkoutUrl){
        window.location.assign(result.checkoutUrl);
      }else{
        throw new Error("CHIP checkout URL was not returned.");
      }

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

  async function cancelAutomaticRenewal(){
    const token = stored(STORAGE.token);
    if(!token || !window.confirm("Cancel automatic renewal? Access remains active until the paid-through date.")){
      return;
    }
    setBillingBusyPlan(currentBillingPlan);
    setBillingError("");
    try{
      const result = await api<{ accessUntil:string | null }>(
        "/billing/cancel-renewal",
        token,
        { method:"POST", body:JSON.stringify({}) },
      );
      setActionMessage(`Automatic renewal canceled. Access remains active until ${result.accessUntil ? new Date(result.accessUntil).toLocaleDateString("en-MY") : "the end of the paid period"}.`);
      props.refresh();
    }catch(error){
      setBillingError(error instanceof Error ? error.message : "Automatic renewal could not be canceled.");
    }finally{
      setBillingBusyPlan(null);
    }
  }

  const activeWorkspaceName =
    props.data.me?.workspace?.name
    ||
    "MyPocket Workspace";

  const activeWorkspaceType =
    props.data.me?.workspace?.type
    ||
    "PERSONAL";

  const profileLabel = String(
    props.data.me?.user?.name
    ||
    props.data.me?.name
    ||
    props.data.me?.user?.email
    ||
    props.data.me?.email
    ||
    activeWorkspaceName,
  );

  const profileInitials = profileLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    ||
    "MP";


  return (
    <div className={sidebarOpen ? "appShell" : "appShell sidebarCollapsed"}>
      <aside className="sidebar">
        <LogoBlock />
        <div className="sidebarWorkspaceContext">
          <span>{dashboardLanguage === "ms" ? "Workspace" : "Workspace"}</span>
          <strong>{activeWorkspaceName}</strong>
          <small>{dashboardLanguage === "ms" ? "Pelan" : "Plan"} · {activeWorkspaceType}</small>
        </div>
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
                  ? currentBillingStatus
                      === "PLAN_CHANGE_PAYMENT_PENDING"
                    ? `Payment: ${billingPlanLabel(
                        pendingBillingPlan,
                      )}`
                    : currentBillingStatus
                        === "PLAN_CHANGE_REVIEW_REQUIRED"
                      ? `Review: ${billingPlanLabel(
                          pendingBillingPlan,
                        )}`
                      : billingPlanAmount(
                          pendingBillingPlan,
                        )
                          >
                        billingPlanAmount(
                          currentBillingPlan,
                        )
                        ? `Pay now: ${billingPlanLabel(
                            pendingBillingPlan,
                          )}`
                        : `Next: ${billingPlanLabel(
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
            <span className="mobileProductBrand">
              <img src="/mypocket-logo.png?v=3" alt="" aria-hidden="true" />
              MyPocket AI
            </span>
            {props.data.workspaces.length > 1 ? (
              <select
                className="workspace workspaceSelect"
                aria-label="Active workspace"
                value={
                  props.data.me?.workspace?.id
                  ||
                  ""
                }
                onChange={(event) =>
                  void props.switchWorkspace(
                    event.target.value,
                  )
                }
              >
                {props.data.workspaces.map(
                  (workspace) => (
                    <option
                      value={workspace.id}
                      key={workspace.id}
                    >
                      {workspace.name} — {workspace.type} ({workspace.role})
                    </option>
                  ),
                )}
              </select>
            ) : (
              <span className="workspace">
                {props.data.me?.workspace?.name || "MyPocket Workspace"}
              </span>
            )}
            <span className="pill">
              {props.data.me?.workspace?.type || "PERSONAL"}
            </span>
          </div>

          <div className="topActions">
            <div className="notificationCenter">
              <button
                className="notificationBell"
                type="button"
                aria-label={
                  dashboardLanguage === "ms"
                    ? `Notifikasi${unreadNotificationCount ? `, ${unreadNotificationCount} belum dibaca` : ""}`
                    : `Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`
                }
                aria-expanded={notificationOpen}
                aria-haspopup="dialog"
                onClick={() => {

                  cancelNotificationClose();

                  const nextOpen =
                    !notificationOpen;

                  setNotificationOpen(
                    nextOpen,
                  );

                }}
              >
                <span aria-hidden="true">
                  🔔
                </span>

                {unreadNotificationCount > 0 && (
                  <strong className="notificationBadge">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </strong>
                )}
              </button>

              {notificationOpen && (
                <section
                  className="notificationPanel"
                  onMouseEnter={cancelNotificationClose}
                  onMouseLeave={scheduleNotificationClose}
                  role="dialog"
                  aria-label={
                    dashboardLanguage === "ms"
                      ? "Pusat notifikasi"
                      : "Notification center"
                  }
                >
                  <header className="notificationHeader">
                    <div>
                      <strong>
                        {dashboardLanguage === "ms" ? "Notifikasi" : "Notifications"}
                      </strong>
                      <span>
                        {
                          dashboardLanguage === "ms"
                            ? `${visibleDashboardNotifications.length} makluman semasa`
                            : `${visibleDashboardNotifications.length} current alerts`
                        }
                      </span>
                    </div>

                    <div className="notificationHeaderActions">
                      <button
                        type="button"
                        className="notificationAction"
                        onClick={markNotificationsSeen}
                        disabled={visibleDashboardNotifications.length === 0 || unreadNotificationCount === 0}
                      >
                        {dashboardLanguage === "ms" ? "Tanda semua dibaca" : "Mark all read"}
                      </button>

                      <button
                        type="button"
                        className="notificationAction"
                        onClick={markNotificationsUnread}
                        disabled={visibleDashboardNotifications.length === 0 || unreadNotificationCount === visibleDashboardNotifications.length}
                      >
                        {dashboardLanguage === "ms" ? "Tanda semua belum dibaca" : "Mark all unread"}
                      </button>

                      <button
                        type="button"
                        className="notificationAction"
                        onClick={clearIgnoredNotifications}
                        disabled={ignoredNotificationIds.length === 0}
                      >
                        {dashboardLanguage === "ms" ? "Show ignored" : "Show ignored"}
                      </button>

                      <button
                        type="button"
                        className="notificationClose"
                        aria-label={dashboardLanguage === "ms" ? "Tutup notifikasi" : "Close notifications"}
                        onClick={() => {
                          cancelNotificationClose();
                          setNotificationOpen(false);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </header>

                  <div className="notificationList">
                    {visibleDashboardNotifications.length === 0 && (
                      <p className="notificationEmpty">
                        {
                          dashboardLanguage === "ms"
                            ? "Tiada notifikasi baharu."
                            : "No new notifications."
                        }
                      </p>
                    )}

                    {visibleDashboardNotifications.map(
                      (notification) => {

                        const isNotificationRead =
                          seenNotificationIds.includes(
                            notification.id,
                          );

                        return (
                        <div
                          className={`notificationItem ${notification.level} ${isNotificationRead ? "read" : "unread"}`}
                          key={notification.id}
                        >
                          <i aria-hidden="true" />

                          <button
                            type="button"
                            className="notificationItemMain"
                            onClick={() => openDashboardNotification(notification)}
                          >
                            <strong>
                              {notification.title}
                            </strong>
                            <small>
                              {notification.message}
                            </small>
                          </button>

                          <button
                            type="button"
                            className="notificationToggle"
                            onClick={() => setNotificationReadState(
                              notification.id,
                              !isNotificationRead,
                            )}
                          >
                            {
                              isNotificationRead
                                ? dashboardLanguage === "ms"
                                  ? "Tanda belum dibaca"
                                  : "Mark unread"
                                : dashboardLanguage === "ms"
                                  ? "Tanda dibaca"
                                  : "Mark read"
                            }
                          </button>

                          <button
                            type="button"
                            className="notificationToggle"
                            onClick={() => ignoreDashboardNotification(
                              notification.id,
                            )}
                          >
                            {dashboardLanguage === "ms" ? "Ignore" : "Ignore"}
                          </button>
                        </div>
                      );

                      },
                    )}
                  </div>
                </section>
              )}
            </div>

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
            <span className="profileAvatar" aria-label={profileLabel} title={profileLabel}>
              {profileInitials}
            </span>
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
              allTransactions:
                props.data.transactions,
              dashboardTimeZone,
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
              goToView("transactions")
            }
            onOpenWhatsApp={() =>
              goToView("whatsapp")
            }
            canManageWhatsApp={
              canChangeWorkspaceSettings
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

            <div className="tableWrap transactionsTableWrap">
              <table className="transactionsTable">
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
                    <th>{dashboardText.receiptReference}</th>
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
                            ? 9
                            : 8
                        }
                        className="hint transactionEmptyCell"
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
                          <td className="transactionSelectCell">
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
                      <td
                        className="transactionDateCell"
                        data-label={dashboardText.date}
                      >
                        {new Date(item.transactionDate).toLocaleString("en-MY")}
                      </td>
                      <td
                        className="transactionTypeCell"
                        data-label={dashboardText.type}
                      >
                        <span className={`type ${item.type.toLowerCase()}`}>
                          {item.type}
                        </span>
                      </td>
                      <td
                        className="transactionCategoryCell"
                        data-label={dashboardText.category}
                      >
                        {item.category?.name || "-"}
                      </td>
                      <td
                        className="transactionMerchantCell"
                        data-label={dashboardText.merchant}
                      >
                        {item.merchant?.name || "-"}
                      </td>
                      <td
                        className="transactionReferenceCell"
                        data-label={dashboardText.receiptReference}
                      >
                        {item.receiptReference || "-"}
                      </td>
                      <td
                        className={`transactionAmountCell ${
                          item.type === "INCOME"
                            ? "incomeText"
                            : "expenseText"
                        }`}
                        data-label={dashboardText.amount}
                      >
                        {money(item.amount, item.currency)}
                      </td>
                      <td
                        className="transactionSourceCell"
                        data-label={dashboardText.source}
                      >
                        {item.source || "SYSTEM"}
                      </td>

                      <td
                        className="transactionRecordedByCell"
                        data-label={dashboardText.recordedBy}
                      >

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
                  {commitmentsViewData?.period.label || dashboardText.currentMonth} · {dashboardText.totalUnpaid} {money(commitmentsViewData?.summary.totalUnpaid)}
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
                      <span>{money(item.amount)} · {dashboardText.due} {new Date(item.currentMonth.dueDate).toLocaleDateString("ms-MY")} · {item.currentMonth.status}</span>
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
                      <button className="ghost danger" onClick={() => deleteCommitment(item.id, item.name)} disabled={!item.canManage}>
                        {dashboardText.delete}
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

                  {member.whatsappPhoneNumber && canChangeWorkspaceSettings && (
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
                {!isWhatsAppConnected && canChangeWorkspaceSettings && (
                  <button
                    className="primary"
                    onClick={() => props.openWhatsAppQr("dashboard")}
                  >
                    Open WhatsApp QR
                  </button>
                )}

                {isWhatsAppConnected && canChangeWorkspaceSettings && (
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
                  [
                    "Template",
                    isMemberRole && !googleTemplateType
                      ? "Managed by Owner/Admin"
                      : googleTemplateType || workspaceType,
                  ],
                  [
                    "Title",
                    isMemberRole && !props.data.google?.spreadsheetTitle
                      ? "Workspace owner Google Sheet"
                      : props.data.google?.spreadsheetTitle || "-",
                  ],
                  [
                    "Backup",
                    isMemberRole
                      ? "Managed by Owner/Admin"
                      : props.data.google?.backupSpreadsheetTitle || "-",
                  ],
                  [
                    "Mode",
                    isMemberRole
                      ? "OWNER_MANAGED"
                      : props.data.google?.mode || "-",
                  ],
                  [
                    "Current Template",
                    isMemberRole
                      ? "Managed by Owner/Admin"
                      : props.data.google?.currentTemplateVersion || "-",
                  ],
                  [
                    "Latest Template",
                    isMemberRole
                      ? "Managed by Owner/Admin"
                      : props.data.google?.latestTemplateVersion || "-",
                  ],
                  [
                    "Update Status",
                    isMemberRole
                      ? "Managed by Owner/Admin"
                      : props.data.google?.templateUpdateAvailable
                        ? "Update Available"
                        : props.data.google?.templateUpdateStatus || "-",
                  ],
                ]}
              />

              {isMemberRole && (
                <div className="sheetUrlBox">
                  <span>Google Sheet workspace</span>
                  <strong>
                    Managed by Owner/Admin. Transaksi anda akan direkod melalui
                    bot workspace.
                  </strong>
                </div>
              )}

              {backupGoogleSheetUrl && !isMemberRole && (
                <div className="sheetWarning">
                  Backup Sheet dibuat dalam Google Drive anda untuk restore dan
                  redundancy. Jangan delete atau edit fail backup ini kecuali
                  anda memang mahu reset backup.
                </div>
              )}

              {hasGoogleTemplateMismatch && canChangeWorkspaceSettings && (
                <div className="sheetWarning">
                  Workspace sekarang ialah {workspaceType}, tetapi Google Sheet
                  yang tersambung masih menggunakan template {googleTemplateType}.
                  Jika mahu sheet ikut package semasa, recreate atau connect
                  semula Google Sheet.
                </div>
              )}

              {props.data.google?.templateUpdateAvailable && canChangeWorkspaceSettings && (
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

              {googleSheetUrl && !isMemberRole && (
                <div className="sheetUrlBox">
                  <span>Advanced: Working Google Sheet URL</span>
                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {googleSheetUrl}
                  </a>
                </div>
              )}

              {backupGoogleSheetUrl && !isMemberRole && (
                <div className="sheetUrlBox backupSheetUrlBox">
                  <span>Advanced: Backup Google Sheet URL — do not delete</span>
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
                  <details className="pd-advanced-recovery-details">
                    <summary className="pd-manual-google-title pd-advanced-recovery-summary">
                    {
                      dashboardLanguage === "ms"
                        ? "Pemulihan Advanced"
                        : "Advanced Recovery"
                    }

                      <span className="pd-advanced-recovery-summary-hint">
                        Klik untuk buka pilihan restore sheet lama
                      </span>
                    </summary>
                    <div className="pd-advanced-recovery-content">

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
                      Auto Setup / Repair Google Sheet
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
                      Restore Existing MyPocket Sheet
                    </button>
                  </div>

                  {
                    legacyManualStorageMode === "auto"
                    &&
                    (
                      <div className="pd-manual-google-message">
                        Auto Created mode will use the existing Connect/Recreate Google Sheet actions below. Use Restore Existing MyPocket Sheet when the folder or sheet already exists in Google Drive.
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
                      Advanced: Google Drive Folder URL
                    </span>
                    <input
                      type="url"
                      aria-label="Advanced Google Drive Folder URL"
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
                      Advanced: Working Google Sheet URL
                    </span>
                    <input
                      type="url"
                      aria-label="Advanced Working Google Sheet URL"
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
                      Advanced: Backup Google Sheet URL (optional)
                    </span>
                    <input
                      type="url"
                      aria-label="Advanced Backup Google Sheet URL (optional)"
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
                          : "Check Existing Sheet"
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
                          Repair Working Sheet
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
                          Repair Backup Sheet
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
                          : "Restore This Sheet"
                      }
                    </button>
                  </div>

                    </div>
                  </details>
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

            {props.data.google?.spreadsheetId && !isMemberRole && (
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
              {!props.data.google?.spreadsheetId && canChangeWorkspaceSettings && (
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
              {canChangeWorkspaceSettings && isWhatsAppConnected
                ? (
                  <Action
                    title="Disconnect WhatsApp"
                    desc={dashboardLanguage === "ms" ? "Putuskan bot semasa sebelum pair semula." : "Disconnect the current bot before pairing again."}
                    icon="⏻"
                    onClick={() => props.resetWhatsAppInstance()}
                  />
                )
                : canChangeWorkspaceSettings ? (
                  <Action
                    title="Open WhatsApp QR"
                    desc={dashboardLanguage === "ms" ? "Pair bot sekali dengan nombor WhatsApp anda." : "Pair the bot once with your WhatsApp number."}
                    icon="☏"
                    onClick={() => props.openWhatsAppQr("dashboard")}
                  />
                ) : null}
              {canChangeWorkspaceSettings && (
                <Action title={dashboardText.openSetupWizard} desc={dashboardLanguage === "ms" ? "Semak langkah onboarding." : "Review onboarding steps."} icon="⚙" onClick={props.resetWizard} />
              )}
            </div>
            </Panel>
          )}

          {isSuperAdmin && activeView === "super-admin" && (
            <>
              <BillingSettingsPanel
                apiBase={API_BASE}
                token={localStorage.getItem(STORAGE.token) ?? ""}
              />
              <PromoCodeSettings
                apiBase={API_BASE}
                token={localStorage.getItem(STORAGE.token) ?? ""}
              />
              <AdminUserManagement
                users={props.data.adminUsers}
                busyUserId={packageBusyUserId}
                message={actionMessage}
                onRefresh={props.refresh}
                onUpdatePackage={updateUserPackage}
                onSuperAdminUserAction={superAdminUserAction}
              />
            </>
          )}

          {canManageMembers && activeView === "admin" && (
            <Panel title="User Role Management" wide>
              {
                shouldShowGoogleSheetAccessNotice
                &&
                (
                  <div
                    className="pd-warning"
                    role="note"
                  >
                    {
                      dashboardLanguage === "ms"
                        ? "Perhatian akses Google Sheet: Admin/Member boleh menggunakan bot workspace tanpa akses terus ke fail. Jika mereka perlu membuka Google Sheet, Owner perlu buka Google Sheet, tekan Share dan tambah email mereka sebagai Viewer atau Editor. Kebenaran ini ditentukan oleh Owner dan tidak menjejaskan akses bot."
                        : "Google Sheet access notice: Admins and Members can use the workspace bot without direct file access. If they need to open the Google Sheet, the Owner must open the sheet, select Share, and add their email as a Viewer or Editor. This permission is controlled by the Owner and does not affect bot access."
                    }
                  </div>
                )
              }

              <p className="helperText">
                Owner/Admin boleh create invite link, tukar role, remove member dan pautkan nombor WhatsApp.
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
                  Create invite link
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
                        ? currentBillingStatus
                            === "PLAN_CHANGE_PAYMENT_PENDING"
                          ? `${billingPlanLabel(
                              pendingBillingPlan,
                            )} payment is being verified before access changes.`
                          : currentBillingStatus
                              === "PLAN_CHANGE_REVIEW_REQUIRED"
                            ? `${billingPlanLabel(
                                pendingBillingPlan,
                              )} payment needs review before access changes.`
                            : billingPlanAmount(
                                pendingBillingPlan,
                              )
                                >
                              billingPlanAmount(
                                currentBillingPlan,
                              )
                              ? `${billingPlanLabel(
                                  pendingBillingPlan,
                                )} is ready for an immediate balance payment.`
                              : `${billingPlanLabel(
                                  pendingBillingPlan,
                                )} downgrade is scheduled for the next billing cycle.`
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
          <ChipBillingPlanModal
            apiBase={API_BASE}
            token={stored(STORAGE.token)}
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
            accessState={props.data.billing?.billing?.accessState}
            currentInterval={props.data.billing?.billing?.billingInterval}
            paidThroughAt={props.data.billing?.billing?.paidThroughAt}
            paymentDueAt={props.data.billing?.billing?.paymentDueAt}
            graceEndsAt={props.data.billing?.billing?.graceEndsAt}
            cancelAtPeriodEnd={props.data.billing?.billing?.cancelAtPeriodEnd}
            renewalHistory={props.data.billing?.renewalHistory}
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
            cancelRenewal={cancelAutomaticRenewal}
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

        {mobileMoreOpen && (
          <div
            className="mobileMoreBackdrop"
            role="presentation"
            onClick={() => setMobileMoreOpen(false)}
          >
            <section
              className="mobileMoreSheet"
              ref={mobileMoreSheetRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label={
                dashboardLanguage === "ms"
                  ? "Lebih banyak menu"
                  : "More navigation"
              }
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <strong>
                    {dashboardLanguage === "ms" ? "Menu lain" : "More"}
                  </strong>
                  <span>
                    {props.data.me?.workspace?.name || "MyPocket Workspace"}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label={dashboardLanguage === "ms" ? "Tutup menu" : "Close menu"}
                  onClick={() => setMobileMoreOpen(false)}
                >
                  ×
                </button>
              </header>

              <div className="mobileMoreGrid">
                {navItems
                  .filter((item) => ![
                    "dashboard",
                    "transactions",
                    "commitments",
                  ].includes(item.view))
                  .map((item) => (
                    <button
                      type="button"
                      key={item.view}
                      className={activeView === item.view ? "active" : ""}
                      onClick={() => goToView(item.view)}
                    >
                      <AppIcon name={item.icon} size={20} strokeWidth={2} />
                      <span>{item.label}</span>
                    </button>
                  ))}

                {isSuperAdmin && (
                  <button
                    type="button"
                    className={activeView === "super-admin" ? "active" : ""}
                    onClick={() => goToView("super-admin")}
                  >
                    <AppIcon name="settings" size={20} strokeWidth={2} />
                    <span>Super Admin</span>
                  </button>
                )}
              </div>
            </section>
          </div>
        )}

        <nav className="mobileNav" aria-label="Primary navigation">
          {navItems
            .filter((item) => [
              "dashboard",
              "transactions",
            ].includes(item.view))
            .map((item) => (
              <button
                type="button"
                key={item.view}
                className={activeView === item.view ? "active" : ""}
                onClick={() => goToView(item.view)}
              >
                <AppIcon name={item.icon} size={20} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            ))}

          {
            mobileWhatsAppUrl
              ? (
                  <a
                    className="mobileAddAction"
                    href={mobileWhatsAppUrl}
                    aria-label={
                      dashboardLanguage === "ms"
                        ? "Buka bot MyPocket di WhatsApp dengan arahan tanda seru"
                        : "Open the MyPocket WhatsApp bot with an exclamation command"
                    }
                  >
                    <span aria-hidden="true">
                      <AppIcon name="whatsapp" size={23} strokeWidth={2.2} />
                    </span>
                    <small>WhatsApp</small>
                  </a>
                )
              : (
                  <button
                    type="button"
                    className="mobileAddAction"
                    onClick={() => goToView("whatsapp")}
                    aria-label={
                      dashboardLanguage === "ms"
                        ? "Sambungkan bot WhatsApp"
                        : "Connect the WhatsApp bot"
                    }
                  >
                    <span aria-hidden="true">
                      <AppIcon name="whatsapp" size={23} strokeWidth={2.2} />
                    </span>
                    <small>WhatsApp</small>
                  </button>
                )
          }

          {navItems
            .filter((item) => item.view === "commitments")
            .map((item) => (
              <button
                type="button"
                key={item.view}
                className={activeView === item.view ? "active" : ""}
                onClick={() => goToView(item.view)}
              >
                <AppIcon name={item.icon} size={20} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            ))}

          <button
            type="button"
            ref={mobileMoreTriggerRef}
            className={mobileMoreOpen ? "active" : ""}
            aria-expanded={mobileMoreOpen}
            onClick={() => setMobileMoreOpen((current) => !current)}
          >
            <span className="mobileMoreIcon" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{dashboardLanguage === "ms" ? "Lagi" : "More"}</span>
          </button>
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


  const currentBillingAmount =
    billingPlanAmount(
      props.currentBillingPlan,
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
              {
                props.billingStatus
                  === "PLAN_CHANGE_PAYMENT_PENDING"
                  ? "Payment processing"
                  : props.billingStatus
                      === "PLAN_CHANGE_REVIEW_REQUIRED"
                    ? "Payment review required"
                    : billingPlanAmount(
                        props.pendingPlan,
                      )
                        >
                      currentBillingAmount
                      ? "Immediate upgrade available"
                      : "Downgrade scheduled"
              }
            </strong>

            <span>
              {
                props.billingStatus
                  === "PLAN_CHANGE_PAYMENT_PENDING"
                  ? `${billingPlanLabel(
                      props.pendingPlan,
                    )} activates after the signed payment confirmation.`
                  : props.billingStatus
                      === "PLAN_CHANGE_REVIEW_REQUIRED"
                    ? `${billingPlanLabel(
                        props.pendingPlan,
                      )} remains locked until the payment is reconciled.`
                    : billingPlanAmount(
                        props.pendingPlan,
                      )
                        >
                      currentBillingAmount
                      ? `Pay the RM${(
                          billingPlanAmount(
                            props.pendingPlan,
                          )
                          -
                          currentBillingAmount
                        ).toFixed(2)} balance now to activate ${billingPlanLabel(
                          props.pendingPlan,
                        )}.`
                      : `${billingPlanLabel(
                          props.pendingPlan,
                        )} becomes active on the next billing cycle.`
              }
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

        <PromoQuoteDisclosure
          apiBase={API_BASE}
          token={localStorage.getItem(STORAGE.token) ?? ""}
        />

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

              const amountDifference =
                Number(
                  (
                    option.amount
                    -
                    currentBillingAmount
                  ).toFixed(2),
                );

              const isUpgrade =
                recurringBillingAvailable
                &&
                amountDifference > 0;

              const isDowngrade =
                recurringBillingAvailable
                &&
                amountDifference < 0;

              const paymentPending =
                isPending
                &&
                props.billingStatus
                  === "PLAN_CHANGE_PAYMENT_PENDING";

              const paymentReview =
                isPending
                &&
                props.billingStatus
                  === "PLAN_CHANGE_REVIEW_REQUIRED";

              const scheduledDowngrade =
                isPending
                &&
                !paymentPending
                &&
                !paymentReview
                &&
                amountDifference <= 0;

              const anotherPendingPlan =
                Boolean(
                  props.pendingPlan
                  &&
                  !isPending,
                );

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
                paymentPending
                ||
                paymentReview
                ||
                scheduledDowngrade
                ||
                anotherPendingPlan
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

              }else if(paymentPending){

                buttonLabel =
                  "Payment processing";

              }else if(paymentReview){

                buttonLabel =
                  "Payment review";

              }else if(scheduledDowngrade){

                buttonLabel =
                  "Scheduled downgrade";

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

              }else if(isUpgrade){

                buttonLabel =
                  `Pay RM${amountDifference.toFixed(2)} & switch now`;

              }else if(isDowngrade){

                buttonLabel =
                  "Schedule downgrade";

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
                        {
                          paymentPending
                            ? "Payment pending"
                            : paymentReview
                              ? "Review required"
                              : isUpgrade
                                ? "Pay balance now"
                                : "Next cycle"
                        }
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
            Payments are processed securely by CHIP.
          </span>

          <span>
            Upgrades charge only the price difference immediately through CHIP. Access changes after the signed payment confirmation.
          </span>

          <span>
            Downgrades take effect on the next billing cycle.
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
    mascot?:boolean;
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

  const qrReady =
    Boolean(
      props.qr.imageSrc,
    )
    &&
    !props.qr.loading
    &&
    !expired;

  const [qrZoomed, setQrZoomed] =
    useState(false);

  useEffect(() => {

    if(!qrReady && qrZoomed){
      setQrZoomed(false);
    }

  }, [
    qrReady,
    qrZoomed,
  ]);

  useEffect(() => {

    if(props.inline){
      return;
    }

    const closeOnEscape =
      (event:KeyboardEvent) => {
        if(event.key === "Escape"){
          if(qrZoomed){
            setQrZoomed(false);
          }else{
            props.closeQr();
          }
        }
      };

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => window.removeEventListener(
      "keydown",
      closeOnEscape,
    );

  }, [
    props.inline,
    props.closeQr,
    qrZoomed,
  ]);

  const panelClassName =
    `qrPanel${props.inline ? " inline" : ""}${props.mascot ? " mascot" : ""}`;

  const content =
    (
      <section
        className={panelClassName}
        aria-labelledby="whatsappQrTitle"
      >
        <div className="qrHeader">
          <div>
            <h2 id="whatsappQrTitle">
              {props.mascot ? "Kod QR WhatsApp anda" : "WhatsApp pairing QR"}
            </h2>
            <p>
              {props.mascot
                ? "Imbas kod yang dipegang mascot melalui WhatsApp → Linked devices → Link a device."
                : "Scan QR ini di WhatsApp → Linked devices → Link a device."}
            </p>
          </div>

          <button
            className="iconButton"
            onClick={props.closeQr}
            aria-label="Close WhatsApp QR"
            autoFocus={!props.inline}
          >
            ×
          </button>
        </div>

        {props.mascot && (
          <div className="qrMascotStage">
            <img
              className="qrMascotFigure"
              src="/mypocket-mascot-qr-holder.png"
              alt="Mascot MyPocket AI memegang kod QR WhatsApp"
            />

            <div className="qrMascotPlacard">
              {props.qr.loading && (
                <span className="qrMascotLoader" aria-hidden="true" />
              )}

              {qrReady && (
                <button
                  type="button"
                  className="qrMascotZoomButton"
                  onClick={() => setQrZoomed(true)}
                  aria-label="Besarkan kod QR"
                >
                  <img
                    className="qrMascotCode"
                    src={props.qr.imageSrc}
                    alt="Kod QR untuk sambungkan WhatsApp"
                  />
                </button>
              )}

              {!props.qr.loading && !qrReady && (
                <span className="qrMascotAlert" aria-hidden="true">!</span>
              )}
            </div>
          </div>
        )}

        {props.qr.loading && (
          <div
            className="qrState"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {props.mascot
              ? "Mascot sedang menyediakan kod QR baharu..."
              : "Sedang dapatkan QR daripada Evolution..."}
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

        {!props.mascot && props.qr.imageSrc && !props.qr.loading && !expired && (
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

        {props.mascot && qrReady && (
          <button
            type="button"
            className="qrZoomHint"
            onClick={() => setQrZoomed(true)}
          >
            Tekan QR untuk besarkan
          </button>
        )}

        <div className="qrActions">
          <button
            className="secondary"
            onClick={props.openQr}
          >
            {props.mascot ? "Muat semula QR" : "Reload QR"}
          </button>

          <button
            className="primary"
            onClick={props.resetQr}
          >
            {props.mascot ? "Jana QR baharu" : "Generate fresh QR"}
          </button>
        </div>

        <p className="hint">
          Selepas bot disambungkan, QR ini tidak boleh digunakan pada peranti lain.
        </p>

        {props.mascot && qrZoomed && qrReady && (
          <div
            className="qrZoomOverlay"
            role="group"
            aria-label="Paparan kod QR dibesarkan"
            onMouseDown={(event) => {
              if(event.target === event.currentTarget){
                setQrZoomed(false);
              }
            }}
          >
            <div className="qrZoomCard">
              <button
                type="button"
                className="iconButton qrZoomClose"
                onClick={() => setQrZoomed(false)}
                aria-label="Kecilkan kod QR"
                autoFocus
              >
                ×
              </button>

              <strong>Kod QR dibesarkan</strong>
              <img
                className="qrZoomCode"
                src={props.qr.imageSrc}
                alt="Kod QR WhatsApp bersaiz besar"
              />
              <p>Imbas kod ini melalui WhatsApp sebelum masa tamat.</p>
            </div>
          </div>
        )}
      </section>
    );


  if(props.inline){

    return content;

  }


  return (
    <div
      className={`qrModalBackdrop${props.mascot ? " mascot" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsappQrTitle"
      onMouseDown={(event) => {
        if(event.target === event.currentTarget){
          props.closeQr();
        }
      }}
    >
      {content}
    </div>
  );

}


function PublicLanding(){

  return (
    <main className="mLanding" id="top">

      <header className="mNav">
        <div className="mNavInner">

          <a
            className="mBrandLink"
            href="#top"
            aria-label="MyPocket AI home"
          >
            <LogoBlock />
          </a>

          <nav className="mNavLinks" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="mNavActions">
            <a
              className="mNavLogin"
              href="https://app.imai.my"
            >
              Sign In
            </a>

            <a
              className="mButton mButtonPrimary mNavCta"
              href="https://app.imai.my"
            >
              Get Started
            </a>
          </div>

        </div>
      </header>


      <section className="mHero">

        <div className="mHeroInner">

          <div className="mHeroCopy">

            <h1>
              Manage your finances
              <span> effortlessly.</span>
              <br />
              Right from WhatsApp.
            </h1>

            <p className="mHeroLead">
              Record expenses, send receipts or voice notes,
              track your balance and manage monthly commitments
              through simple WhatsApp conversations with MyPocket AI.
            </p>

            <div className="mHeroButtons">

              <a
                className="mButton mButtonPrimary"
                href="https://app.imai.my"
              >
                Start with MyPocket AI
                <span aria-hidden="true">→</span>
              </a>

              <a
                className="mButton mButtonGhost"
                href="#how"
              >
                See How It Works
              </a>

            </div>

            <div className="mHeroProof">

              <div>
                <strong>01</strong>
                <span>Chat naturally</span>
              </div>

              <div>
                <strong>02</strong>
                <span>Receipts & voice notes</span>
              </div>

              <div>
                <strong>03</strong>
                <span>Your own Google Sheet</span>
              </div>

            </div>

          </div>


          <div
            className="mHeroVisual"
            aria-label="MyPocket AI WhatsApp demo"
          >

            <div className="mHeroGlow" aria-hidden="true"></div>

            <div className="mMascotHalo">

              <div className="mMascotOrbit mOrbitOne"></div>
              <div className="mMascotOrbit mOrbitTwo"></div>

              <img
                className="mMascot"
                src="/mypocket-robot.webp?v=1"
                alt="MyPocket AI robot mascot"
              />

            </div>


            <div className="mPhone">

              <div className="mPhoneNotch"></div>

              <div className="mPhoneHeader">

                <img
                  src="/dashboard-icons/whatsapp-logo.png"
                  alt=""
                />

                <div>
                  <strong>MyPocket AI</strong>
                  <span>online</span>
                </div>

              </div>


              <div className="mPhoneChat">

                <div className="mChatDate">
                  Today
                </div>

                <div className="mChatBubble mChatUser">
                  Lunch RM12.50 via TNG
                </div>

                <div className="mChatBubble mChatBot">
                  <strong>Recorded successfully ✅</strong>
                  <span>Food · RM12.50</span>
                  <span>TNG eWallet</span>
                </div>

                <div className="mChatBubble mChatUser">
                  What is my balance this month?
                </div>

                <div className="mChatBubble mChatBot">
                  <strong>Current balance</strong>
                  <span className="mChatAmount">RM2,840.50</span>
                </div>

              </div>


              <div className="mPhoneComposer">
                <span>Type a message...</span>
                <strong>➤</strong>
              </div>

            </div>


            <div className="mFloatCard mFloatExpense">

              <div className="mFloatIcon">✓</div>

              <div>
                <span>Transaction recorded</span>
                <strong>RM12.50</strong>
              </div>

            </div>


            <div className="mFloatCard mFloatVoice">

              <div className="mWaveIcon">
                <i></i><i></i><i></i><i></i><i></i>
              </div>

              <div>
                <span>Voice Intelligence</span>
                <strong>Understood</strong>
              </div>

            </div>


            <div className="mFloatCard mFloatSheet">

              <img
                src="/dashboard-icons/google-sheets-logo.png"
                alt=""
              />

              <div>
                <span>Google Sheet</span>
                <strong>Synced</strong>
              </div>

            </div>

          </div>

        </div>

      </section>


      <section className="mValueStrip">

        <div className="mValueItem">
          <span>WhatsApp-first</span>
          <strong>No complicated app to learn.</strong>
        </div>

        <div className="mValueItem">
          <span>AI-assisted</span>
          <strong>Understands text, receipts and voice notes.</strong>
        </div>

        <div className="mValueItem">
          <span>Privacy-first</span>
          <strong>Your financial data stays within your workspace.</strong>
        </div>

      </section>


      <section id="how" className="mSection mHow">

        <div className="mSectionHead">
          <p className="mSectionLabel">How it works</p>
          <h2>
            From WhatsApp to financial records
            <span> in seconds.</span>
          </h2>
          <p>
            MyPocket AI is designed around the simplest workflow:
            just send a message and let the system handle the rest.
          </p>
        </div>


        <div className="mSteps">

          <article className="mStep">
            <div className="mStepNumber">01</div>
            <div className="mStepIcon">
              <img
                src="/dashboard-icons/whatsapp-logo.png"
                alt=""
              />
            </div>
            <h3>Send it through WhatsApp</h3>
            <p>
              Type a transaction, send a receipt photo or use
              a voice note just like a normal conversation.
            </p>
          </article>


          <article className="mStep">
            <div className="mStepNumber">02</div>
            <div className="mStepIcon mStepAi">AI</div>
            <h3>MyPocket AI understands</h3>
            <p>
              AI identifies the amount, category, payment method
              and the financial action behind your message.
            </p>
          </article>


          <article className="mStep">
            <div className="mStepNumber">03</div>
            <div className="mStepIcon">
              <img
                src="/dashboard-icons/google-sheets-logo.png"
                alt=""
              />
            </div>
            <h3>Records and insights are ready</h3>
            <p>
              Review everything through WhatsApp, your dashboard
              and the Google Sheet connected to your workspace.
            </p>
          </article>

        </div>

      </section>


      <section id="features" className="mSection mFeatures">

        <div className="mSectionHead mSectionHeadLeft">
          <p className="mSectionLabel">Built for everyday finance</p>
          <h2>
            More than just an
            <span> expense tracker.</span>
          </h2>
        </div>


        <div className="mFeatureGrid">

          <article className="mFeature mFeatureLarge">

            <div className="mFeatureCopy">
              <span className="mFeatureNo">01</span>
              <h3>WhatsApp Finance Assistant</h3>
              <p>
                Record income and expenses using natural language,
                whether you type formally or in everyday chat.
              </p>
            </div>

            <div className="mMiniConversation">
              <div>lunch rm8 tng</div>
              <div>
                <strong>✓ Recorded</strong>
                <span>Food · RM8.00 · TNG</span>
              </div>
            </div>

          </article>


          <article className="mFeature">

            <span className="mFeatureNo">02</span>
            <div className="mFeatureSymbol">▤</div>
            <h3>Receipt Intelligence</h3>
            <p>
              Send a receipt photo and let MyPocket AI extract
              the key information before the record is confirmed.
            </p>

          </article>


          <article className="mFeature">

            <span className="mFeatureNo">03</span>
            <div className="mFeatureSymbol">◖</div>
            <h3>Voice Intelligence</h3>
            <p>
              Use voice notes to record transactions or give
              instructions without typing everything out.
            </p>

          </article>


          <article className="mFeature">

            <span className="mFeatureNo">04</span>
            <div className="mFeatureSymbol">◎</div>
            <h3>Commitments & Reminders</h3>
            <p>
              Track monthly commitments and outstanding payments
              through one simple workflow.
            </p>

          </article>


          <article className="mFeature">

            <span className="mFeatureNo">05</span>
            <div className="mFeatureSymbol">◫</div>
            <h3>Family & Business</h3>
            <p>
              Shared workspaces support Owner, Admin and Member
              roles with permission-based access controls.
            </p>

          </article>


          <article className="mFeature mFeatureWide">

            <div>
              <span className="mFeatureNo">06</span>
              <h3>Your Google Workspace</h3>
              <p>
                Your Google Sheet and financial folders remain connected
                to your workspace with clear recovery and
                access-control workflows.
              </p>
            </div>

            <div className="mGoogleVisual">

              <img
                src="/dashboard-icons/google-sheets-logo.png"
                alt=""
              />

              <span></span>

              <img
                src="/mypocket-logo.png?v=3"
                alt=""
              />

            </div>

          </article>

        </div>

      </section>


      <section id="dashboard" className="mDashboardSection">

        <div className="mDashboardInner">

          <div className="mDashboardCopy">

            <p className="mSectionLabel">MyPocket AI Dashboard</p>

            <h2>
              See your financial picture
              <span> without opening a spreadsheet.</span>
            </h2>

            <p>
              Your dashboard brings together transactions, income,
              expenses, balances, categories and commitments
              so you can understand the month at a glance.
            </p>

            <ul className="mCheckList">
              <li><span>✓</span>Income & expense overview</li>
              <li><span>✓</span>Transaction trends & categories</li>
              <li><span>✓</span>Outstanding commitments</li>
              <li><span>✓</span>Desktop, tablet & mobile</li>
            </ul>

          </div>


          <div className="mDashboardMock">

            <div className="mDashTop">

              <div>
                <span>MyPocket AI</span>
                <strong>Financial Overview</strong>
              </div>

              <div className="mDashMonth">
                This Month
              </div>

            </div>


            <div className="mDashStats">

              <div>
                <span>Income</span>
                <strong>RM6,000</strong>
                <small>Sample data</small>
              </div>

              <div>
                <span>Expenses</span>
                <strong>RM2,450</strong>
                <small>Sample data</small>
              </div>

              <div>
                <span>Balance</span>
                <strong>RM3,550</strong>
                <small>Sample data</small>
              </div>

            </div>


            <div className="mDashBody">

              <div className="mChartPanel">

                <div className="mPanelTitle">
              <strong>Monthly Expenses</strong>
                  <span>30 days</span>
                </div>

                <div className="mBarChart">
                  <i className="mBar1"></i>
                  <i className="mBar2"></i>
                  <i className="mBar3"></i>
                  <i className="mBar4"></i>
                  <i className="mBar5"></i>
                  <i className="mBar6"></i>
                  <i className="mBar7"></i>
                  <i className="mBar8"></i>
                </div>

              </div>


              <div className="mCategoryPanel">

                <div className="mPanelTitle">
                  <strong>Categories</strong>
                </div>

                <div className="mDonutChart"></div>

                <div className="mLegend">
                  <span><i></i>Food</span>
                  <span><i></i>Transport</span>
                  <span><i></i>Shopping</span>
                </div>

              </div>

            </div>


            <div className="mRecent">

              <div className="mPanelTitle">
                <strong>Recent Transactions</strong>
                <span>View all</span>
              </div>

              <div className="mRecentRow">
                <span>🍜</span>
                <div>
                  <strong>Lunch</strong>
                  <small>Food · TNG</small>
                </div>
                <b>-RM12.50</b>
              </div>

              <div className="mRecentRow">
                <span>🚗</span>
                <div>
                  <strong>Petrol</strong>
                  <small>Transport · Card</small>
                </div>
                <b>-RM60.00</b>
              </div>

            </div>

          </div>

        </div>

      </section>


      <section id="pricing" className="mSection mPricing">

        <div className="mSectionHead">
          <p className="mSectionLabel">Plans & Pricing</p>
          <h2>
            Choose the plan that fits
            <span> the way you manage money.</span>
          </h2>
          <p>
            Start as an individual and scale naturally
            to a family or business workspace.
          </p>
        </div>


        <div className="mPricingGrid">

          <Plan
            title="Personal"
            price="RM 0"
            text="Essential tools for personal finance"
            features={[
              "1 WhatsApp number",
              "Google Sheet sync",
              "PWA dashboard",
              "Basic summaries",
            ]}
          />

          <Plan
            title="Personal Pro"
            price="RM 9"
            text="More power for personal finance"
            highlight
            features={[
              "Personal workspace",
              "Backup Google Sheet",
              "Advanced WhatsApp commands",
              "Priority improvements",
            ]}
          />

          <Plan
            title="Family"
            price="RM 19"
            text="Shared finance for households"
            features={[
              "Up to 5 WhatsApp numbers",
              "Roles & permissions",
              "Member mapping",
              "Shared workspace",
            ]}
          />

          <Plan
            title="Business"
            price="RM 49"
            text="Financial workflows for small teams"
            features={[
              "Up to 10 WhatsApp numbers",
              "Advanced audit log",
              "Business workspace",
              "Priority support",
            ]}
          />

        </div>

      </section>


      <section className="mTrust">

        <div className="mTrustInner">

          <div className="mTrustCopy">

            <p className="mSectionLabel">Privacy-first</p>

            <h2>
              Your finances.
              <span> Your control.</span>
            </h2>

            <p>
              MyPocket AI never asks for your Google or WhatsApp
              passwords. Integrations use platform authorization
              and can be disconnected whenever required.
            </p>

            <div className="mTrustLinks">
              <a href="/privacy">Privacy Policy →</a>
              <a href="/terms">Terms of Service →</a>
            </div>

          </div>


          <div className="mTrustGrid">

            <article>
              <span>01</span>
              <strong>Data Ownership</strong>
              <p>
                Your financial workspace connects only to
                the Google Workspace you authorize.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>Role & Access Control</strong>
              <p>
                Owner, Admin and Member controls help keep
                actions separated by responsibility.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>Secure Integrations</strong>
              <p>
                Service connections use supported authentication
                and authorization flows.
              </p>
            </article>

            <article>
              <span>04</span>
              <strong>Recoverable</strong>
              <p>
                Google Storage includes setup, repair and
                recovery workflows for your workspace.
              </p>
            </article>

          </div>

        </div>

      </section>


      <section id="faq" className="mSection mFaq">

        <div className="mSectionHead">
          <p className="mSectionLabel">Frequently Asked Questions</p>
          <h2>Everything you need to know.</h2>
        </div>


        <div className="mFaqGrid">

          <details open>
            <summary>
              Do I need to install another WhatsApp app?
            </summary>
            <p>
              No. MyPocket AI works through WhatsApp
              together with the MyPocket AI web dashboard.
            </p>
          </details>

          <details>
            <summary>
              Can I send receipt photos?
            </summary>
            <p>
              Yes. Receipt Intelligence can extract key
              receipt information before a financial
              action is confirmed.
            </p>
          </details>

          <details>
            <summary>
              Can I use voice notes?
            </summary>
            <p>
              Yes. Voice Intelligence can transcribe voice
              notes and route them through the existing
              MyPocket AI workflow.
            </p>
          </details>

          <details>
            <summary>
              Does MyPocket AI ask for my Google password?
            </summary>
            <p>
              No. MyPocket AI never asks for your
              Google or WhatsApp passwords.
            </p>
          </details>

          <details>
            <summary>
              Can I use it for my family or business?
            </summary>
            <p>
              Yes. Family and Business workspaces support
              multiple members with role-based controls.
            </p>
          </details>

          <details>
            <summary>
              Where can I view my financial reports?
            </summary>
            <p>
              You can review records and summaries through
              the dashboard, WhatsApp and the Google Sheet
              connected to your workspace.
            </p>
          </details>

        </div>

      </section>


      <section className="mFinalCta">

        <div className="mFinalGlow"></div>

        <img
          className="mFinalRobot"
          src="/mypocket-robot.webp?v=1"
          alt=""
        />

        <div className="mFinalCopy">

          <h2>
            Start managing money with
            <span> a single message.</span>
          </h2>

          <p>
            Turn WhatsApp into your everyday financial assistant
            with MyPocket AI.
          </p>

          <div className="mHeroButtons">

            <a
              className="mButton mButtonPrimary"
              href="https://app.imai.my"
            >
              Start with MyPocket AI
              <span aria-hidden="true">→</span>
            </a>

            <a
              className="mButton mButtonGhost"
              href="https://app.imai.my"
            >
              Sign In
            </a>

          </div>

        </div>

      </section>


      <footer className="mFooter">

        <div className="mFooterTop">

          <div className="mFooterBrand">
            <LogoBlock />
            <p>
              AI-powered financial management through WhatsApp,
              your dashboard and Google Workspace.
            </p>
          </div>

          <div className="mFooterLinks">

            <div>
              <strong>Product</strong>
              <a href="#features">Features</a>
              <a href="#how">How It Works</a>
              <a href="#pricing">Pricing</a>
            </div>

            <div>
              <strong>Resources</strong>
              <a href="/help">Help</a>
              <a href="/guides">Guides</a>
              <a href="/updates">Updates</a>
            </div>

            <div>
              <strong>Legal</strong>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>

          </div>

        </div>


        <div className="mFooterBottom">
          <span>© 2026 MyPocket AI. All rights reserved.</span>
          <span>imai.my</span>
        </div>

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
