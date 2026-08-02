import { AppIcon } from "./app-icon";
import {
  useEffect,
  useState,
} from "react";
type TransactionFilterMode =
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "YEAR"
  | "ALL"
  | "CUSTOM";

type DashboardLanguage =
  | "ms"
  | "en";


type PremiumDashboardProps = {
  transactionFilter:TransactionFilterMode;
  transactionFilterLabel:string;
  transactionCustomFrom:string;
  transactionCustomTo:string;
  language?:DashboardLanguage;
  filterStart:number | null;
  filterEnd:number | null;
  onTransactionFilterChange:(value:TransactionFilterMode) => void;
  onTransactionCustomFromChange:(value:string) => void;
  onTransactionCustomToChange:(value:string) => void;
  data:any;
  onRefresh:() => void;
  onSetup:() => void;
  onRelinkGoogle:() => void;
  onRecreateGoogle:() => void;
  onOpenTransactions:() => void;
  onOpenWhatsApp:() => void;
  onAddTransaction:() => void;
  canManageWhatsApp:boolean;
  onSaveWhatsAppAlias:(
    botAlias:string,
  ) => Promise<void>;
};

const currency = (
  value:number,
  currencyCode = "MYR",
) =>
  new Intl.NumberFormat(
    "en-MY",
    {
      style:"currency",
      currency:currencyCode,
      minimumFractionDigits:2,
    },
  ).format(Number(value) || 0);

const sameDay = (
  first:Date,
  second:Date,
) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const statusLabel = (
  value:unknown,
  language:DashboardLanguage = "en",
) => {
  const text =
    PREMIUM_DASHBOARD_TEXT[language];
  const status =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    status.includes("CONNECTED") ||
    status === "READY" ||
    status === "OPEN"
  ){
    return text.connected;
  }

  if (
    status.includes("DISCONNECT") ||
    status.includes("CLOSE")
  ){
    return text.disconnected;
  }

  return value
    ? String(value)
    : text.checking;
};

const dashboardImageIcons:Record<string, string> = {
  whatsapp:"/dashboard-icons/whatsapp-logo.png",
  sheet:"/dashboard-icons/google-sheets-logo.png",
};

const PREMIUM_DASHBOARD_TEXT = {
  en:{
    transactionPeriod:"Transaction period", record:"record", records:"records", today:"Today", thisWeek:"This Week", thisMonth:"This Month", thisYear:"This Year", allTime:"All Time", customRange:"Custom Range", to:"to",
    expense:"Expense", income:"Income", filteredTransaction:"filtered transaction", filteredTransactions:"filtered transactions", balance:"Balance", membersLinked:"members linked", healthy:"Healthy", live:"Live", connected:"Connected", disconnected:"Disconnected", checking:"Checking", notConnected:"Not connected", myPocketWorkspace:"MyPocket workspace",
    expenseTrend:"Expense Trend", spendingByCategory:"Spending by Category", total:"Total", recentTransactions:"Recent Transactions", viewAll:"View all",
    date:"Date", type:"Type", category:"Category", merchant:"Merchant", amount:"Amount", source:"Source", recordedBy:"Recorded by",
    whatsappIntegration:"WhatsApp Integration", manage:"Manage", instance:"Instance", status:"Status", trigger:"Trigger", members:"Members", lastSync:"Last Sync", notLinked:"not linked",
    aliasLabel:"WhatsApp group bot alias", saving:"Saving...", saveAlias:"Save Alias", aliasHelp:"In groups, start messages with ! or @{alias}. Private chat does not need a trigger.",
    disconnectWhatsApp:"Disconnect WhatsApp", recheckStatus:"Recheck status", googleSheet:"Google Sheet", workspacePackage:"Workspace package", template:"Template", title:"Title", mode:"Mode", lastUpdated:"Last Updated",
    sheetNotConnected:"Google Sheet is not connected", openGoogleSheet:"Open Google Sheet", relinkGoogleAccess:"Relink Google Access", recreateGoogleSheet:"Recreate Google Sheet", upgradeGoogleSheetTo:"Upgrade Google Sheet to", quickActions:"Quick Actions", addTransaction:"Add Transaction", useWhatsAppCommand:"Use WhatsApp message command.", setupWizard:"Setup Wizard", reviewOnboarding:"Review onboarding steps.",
  },
  ms:{
    transactionPeriod:"Tempoh transaksi", record:"rekod", records:"rekod", today:"Hari Ini", thisWeek:"Minggu Ini", thisMonth:"Bulan Ini", thisYear:"Tahun Ini", allTime:"Sepanjang Masa", customRange:"Julat Tersuai", to:"hingga",
    expense:"Belanja", income:"Income", filteredTransaction:"transaksi ditapis", filteredTransactions:"transaksi ditapis", balance:"Baki", membersLinked:"ahli dipautkan", healthy:"Sihat", live:"Live", connected:"Connected", disconnected:"Disconnected", checking:"Menyemak", notConnected:"Belum connected", myPocketWorkspace:"Workspace MyPocket",
    expenseTrend:"Trend Belanja", spendingByCategory:"Belanja Mengikut Kategori", total:"Jumlah", recentTransactions:"Transaksi Terkini", viewAll:"Lihat semua",
    date:"Tarikh", type:"Jenis", category:"Kategori", merchant:"Merchant", amount:"Jumlah", source:"Sumber", recordedBy:"Direkod oleh",
    whatsappIntegration:"Integrasi WhatsApp", manage:"Urus", instance:"Instance", status:"Status", trigger:"Trigger", members:"Ahli", lastSync:"Sync terakhir", notLinked:"belum linked",
    aliasLabel:"Alias bot WhatsApp group", saving:"Menyimpan...", saveAlias:"Simpan Alias", aliasHelp:"Dalam group, mula mesej dengan ! atau @{alias}. Private chat tidak perlu trigger.",
    disconnectWhatsApp:"Disconnect WhatsApp", recheckStatus:"Semak semula status", googleSheet:"Google Sheet", workspacePackage:"Pakej workspace", template:"Template", title:"Tajuk", mode:"Mode", lastUpdated:"Terakhir dikemaskini",
    sheetNotConnected:"Google Sheet belum connected", openGoogleSheet:"Buka Google Sheet", relinkGoogleAccess:"Paut semula akses Google", recreateGoogleSheet:"Cipta semula Google Sheet", upgradeGoogleSheetTo:"Upgrade Google Sheet ke", quickActions:"Tindakan Pantas", addTransaction:"Tambah Transaksi", useWhatsAppCommand:"Guna command mesej WhatsApp.", setupWizard:"Setup Wizard", reviewOnboarding:"Semak langkah onboarding.",
  },
} as const;

function DashboardIcon(
  props:{
    name:string;
  },
){
  const imageSource =
    dashboardImageIcons[props.name];

  return (
    <span className="pd-icon">
      {imageSource ? (
        <img
          src={imageSource}
          alt=""
          aria-hidden="true"
        />
      ) : (
        <AppIcon
          name={props.name}
          size={24}
          strokeWidth={1.8}
        />
      )}
    </span>
  );
}


function buildMiniSparklinePath(
  inputValues:number[],
){
  const values =
    inputValues.length >= 2
      ? inputValues
      : [
        inputValues[0] || 0,
        inputValues[0] || 0,
      ];

  const width =
    84;

  const height =
    32;

  const padding =
    3;

  const minimum =
    Math.min(...values);

  const maximum =
    Math.max(...values);

  const range =
    Math.max(
      maximum - minimum,
      1,
    );

  const points =
    values.map(
      (value, index) => ({
        x:
          padding +
          (
            index /
            Math.max(values.length - 1, 1)
          ) *
          (
            width -
            padding * 2
          ),

        y:
          padding +
          (
            1 -
            (
              value - minimum
            ) /
            range
          ) *
          (
            height -
            padding * 2
          ),
      }),
    );

  if (points.length === 2){
    return (
      `M ${points[0].x} ${points[0].y} ` +
      `L ${points[1].x} ${points[1].y}`
    );
  }

  let pathValue =
    `M ${points[0].x} ${points[0].y}`;

  for (
    let index = 1;
    index < points.length - 1;
    index += 1
  ){
    const current =
      points[index];

    const next =
      points[index + 1];

    const midpointX =
      (
        current.x +
        next.x
      ) / 2;

    const midpointY =
      (
        current.y +
        next.y
      ) / 2;

    pathValue +=
      ` Q ${current.x} ${current.y}` +
      ` ${midpointX} ${midpointY}`;
  }

  const secondLast =
    points[points.length - 2];

  const last =
    points[points.length - 1];

  pathValue +=
    ` Q ${secondLast.x} ${secondLast.y}` +
    ` ${last.x} ${last.y}`;

  return pathValue;
}

function MiniSparkline(
  props:{
    values:number[];
    trend:number | null;
  },
){
  const pathValue =
    buildMiniSparklinePath(
      props.values,
    );

  const hasMovement =
    props.values.some(
      (value, index) =>
        index > 0 &&
        value !== props.values[index - 1],
    );

  const trendClass =
    props.trend === null
      ? "neutral"
      : props.trend > 0
        ? "increase"
        : props.trend < 0
          ? "decrease"
          : "neutral";

  const trendText =
    props.trend === null
      ? "—"
      : props.trend > 0
        ? `↑ ${Math.abs(props.trend).toFixed(1)}%`
        : props.trend < 0
          ? `↓ ${Math.abs(props.trend).toFixed(1)}%`
          : "— 0.0%";

  return (
    <div className="pd-spark">
      <svg
        viewBox="0 0 84 32"
        role="img"
        aria-label="Data trend"
      >
        <path
          d={pathValue}
          fill="none"
          stroke={
            hasMovement
              ? "#079b83"
              : "#a7c7c1"
          }
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {props.values.length > 0 && (
          <circle
            cx="81"
            cy={
              (() => {
                const values =
                  props.values.length >= 2
                    ? props.values
                    : [
                      props.values[0] || 0,
                      props.values[0] || 0,
                    ];

                const minimum =
                  Math.min(...values);

                const maximum =
                  Math.max(...values);

                const range =
                  Math.max(
                    maximum - minimum,
                    1,
                  );

                const lastValue =
                  values[values.length - 1];

                return (
                  3 +
                  (
                    1 -
                    (
                      lastValue - minimum
                    ) /
                    range
                  ) *
                  26
                );
              })()
            }
            r="2.5"
            fill="#079b83"
          />
        )}
      </svg>

      <span className={trendClass}>
        {trendText}
      </span>
    </div>
  );
}

function MetricCard(
  props:{
    icon:string;
    label:string;
    value:string;
    subtitle:string;
    trend?:number | null;
    sparklineData?:number[];
    status?:string;
  },
){
  const trend =
    typeof props.trend === "number"
      ? props.trend
      : null;

  const sparklineData =
    props.sparklineData &&
    props.sparklineData.length > 0
      ? props.sparklineData
      : [0, 0];

  return (
    <article className="pd-metric">
      <DashboardIcon
        name={props.icon}
      />

      <div className="pd-metric-copy">
        <span className="pd-eyebrow">
          {props.label}
        </span>

        <strong>
          {props.value}
        </strong>

        <small>
          {props.subtitle}
        </small>
      </div>

      {props.sparklineData && (
        <MiniSparkline
          values={sparklineData}
          trend={trend}
        />
      )}

      {props.status && (
        <span className="pd-health">
          <AppIcon
            name="check"
            size={13}
            strokeWidth={2.2}
          />
          {props.status}
        </span>
      )}
    </article>
  );
}

function DashboardPanel(
  props:{
    title:string;
    titleImage?:string;
    action?:{
      label:string;
      onClick:() => void;
    };
    children:any;
  },
){
  return (
    <article className="pd-panel">
      <header className="pd-panel-header">
        <div className="pd-panel-title">
          {props.titleImage && (
            <img
              src={props.titleImage}
              alt=""
              aria-hidden="true"
            />
          )}

          <h2>{props.title}</h2>
        </div>

        {props.action && (
          <button
            className="pd-mini-button"
            onClick={props.action.onClick}
          >
            {props.action.label}
          </button>
        )}
      </header>

      {props.children}
    </article>
  );
}

export function PremiumDashboard(
  props:PremiumDashboardProps,
){
  const language =
    props.language ?? "en";

  const text =
    PREMIUM_DASHBOARD_TEXT[language];

  const locale =
    language === "ms"
      ? "ms-MY"
      : "en-MY";

  const transactions =
    Array.isArray(props.data?.transactions)
      ? props.data.transactions
      : [];

  const members =
    Array.isArray(props.data?.members)
      ? props.data.members
      : [];

  const currentBotAlias =
    String(
      props.data?.whatsapp?.instance?.botAlias
      ||
      "mypocket",
    )
      .trim()
      .replace(
        /^@+/,
        "",
      )
      .toLowerCase();

  const [botAlias, setBotAlias] =
    useState(
      currentBotAlias,
    );

  const [aliasSaving, setAliasSaving] =
    useState(false);

  const [aliasMessage, setAliasMessage] =
    useState("");

  useEffect(
    () => {

      setBotAlias(
        currentBotAlias,
      );

    },
    [
      currentBotAlias,
    ],
  );

  const now =
    new Date();

  const amountOf =
    (item:any) =>
      Number(
        item?.amount,
      )
      ||
      0;

  const expenses =
    transactions.filter(
      (item:any) =>
        String(
          item?.type,
        ).toUpperCase() === "EXPENSE",
    );

  const incomes =
    transactions.filter(
      (item:any) =>
        String(
          item?.type,
        ).toUpperCase() === "INCOME",
    );

  const periodExpense =
    expenses.reduce(
      (
        total:number,
        item:any,
      ) =>
        total
        +
        amountOf(
          item,
        ),
      0,
    );

  const periodIncome =
    incomes.reduce(
      (
        total:number,
        item:any,
      ) =>
        total
        +
        amountOf(
          item,
        ),
      0,
    );

  const periodBalance =
    periodIncome
    -
    periodExpense;

  const validTransactionDates =
    transactions
      .map(
        (item:any) =>
          new Date(
            item.transactionDate,
          ),
      )
      .filter(
        (date:Date) =>
          Number.isFinite(
            date.getTime(),
          ),
      )
      .sort(
        (
          first:Date,
          second:Date,
        ) =>
          first.getTime()
          -
          second.getTime(),
      );

  const startOfDay =
    (date:Date) =>
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );

  const nextDay =
    (date:Date) =>
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1,
      );

  const fallbackStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

  const fallbackEnd =
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    );

  const inferredStart =
    validTransactionDates.length > 0
      ? startOfDay(
        validTransactionDates[0],
      )
      : fallbackStart;

  const inferredEnd =
    validTransactionDates.length > 0
      ? nextDay(
        validTransactionDates[
          validTransactionDates.length - 1
        ],
      )
      : fallbackEnd;

  const chartStart =
    props.filterStart === null
      ? inferredStart
      : new Date(
        props.filterStart,
      );

  let chartEnd =
    props.filterEnd === null
      ? inferredEnd
      : new Date(
        props.filterEnd,
      );


  if(
    chartEnd.getTime()
    <=
    chartStart.getTime()
  ){

    chartEnd =
      nextDay(
        chartStart,
      );

  }


  type ChartBucket = {
    key:string;
    label:string;
    shortLabel:string;
    start:number;
    end:number;
  };


  const chartBuckets:
    ChartBucket[] =
    [];


  const addDayBuckets =
    (
      start:Date,
      end:Date,
    ) => {

      let cursor =
        startOfDay(
          start,
        );

      let guard =
        0;


      while(
        cursor.getTime() < end.getTime()
        &&
        guard < 400
      ){

        const next =
          nextDay(
            cursor,
          );

        chartBuckets.push({
          key:
            `day-${cursor.getTime()}`,

          label:
            cursor.toLocaleDateString(
              locale,
              {
                day:
                  "numeric",

                month:
                  "short",

                year:
                  "numeric",
              },
            ),

          shortLabel:
            cursor.toLocaleDateString(
              locale,
              {
                day:
                  "numeric",

                month:
                  "short",
              },
            ),

          start:
            cursor.getTime(),

          end:
            Math.min(
              next.getTime(),
              end.getTime(),
            ),
        });

        cursor =
          next;

        guard +=
          1;

      }

    };


  const addMonthBuckets =
    (
      start:Date,
      end:Date,
    ) => {

      let cursor =
        new Date(
          start.getFullYear(),
          start.getMonth(),
          1,
        );

      let guard =
        0;


      while(
        cursor.getTime() < end.getTime()
        &&
        guard < 240
      ){

        const next =
          new Date(
            cursor.getFullYear(),
            cursor.getMonth() + 1,
            1,
          );

        chartBuckets.push({
          key:
            `month-${cursor.getFullYear()}-${cursor.getMonth()}`,

          label:
            cursor.toLocaleDateString(
              locale,
              {
                month:
                  "long",

                year:
                  "numeric",
              },
            ),

          shortLabel:
            cursor.toLocaleDateString(
              locale,
              {
                month:
                  "short",

                year:
                  "2-digit",
              },
            ),

          start:
            Math.max(
              cursor.getTime(),
              start.getTime(),
            ),

          end:
            Math.min(
              next.getTime(),
              end.getTime(),
            ),
        });

        cursor =
          next;

        guard +=
          1;

      }

    };


  const addYearBuckets =
    (
      start:Date,
      end:Date,
    ) => {

      let cursor =
        new Date(
          start.getFullYear(),
          0,
          1,
        );

      let guard =
        0;


      while(
        cursor.getTime() < end.getTime()
        &&
        guard < 100
      ){

        const next =
          new Date(
            cursor.getFullYear() + 1,
            0,
            1,
          );

        chartBuckets.push({
          key:
            `year-${cursor.getFullYear()}`,

          label:
            String(
              cursor.getFullYear(),
            ),

          shortLabel:
            String(
              cursor.getFullYear(),
            ),

          start:
            Math.max(
              cursor.getTime(),
              start.getTime(),
            ),

          end:
            Math.min(
              next.getTime(),
              end.getTime(),
            ),
        });

        cursor =
          next;

        guard +=
          1;

      }

    };


  if(props.transactionFilter === "TODAY"){

    const base =
      startOfDay(
        chartStart,
      );


    for(
      let index = 0;
      index < 8;
      index += 1
    ){

      const start =
        new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          index * 3,
        );

      const end =
        new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          (index + 1) * 3,
        );

      chartBuckets.push({
        key:
          `hour-${index}`,

        label:
          `${start.toLocaleTimeString(
            locale,
            {
              hour:
                "numeric",

              minute:
                "2-digit",
            },
          )} – ${end.toLocaleTimeString(
            locale,
            {
              hour:
                "numeric",

              minute:
                "2-digit",
            },
          )}`,

        shortLabel:
          start.toLocaleTimeString(
            locale,
            {
              hour:
                "numeric",
            },
          ),

        start:
          start.getTime(),

        end:
          end.getTime(),
      });

    }

  }else if(
    props.transactionFilter === "WEEK"
    ||
    props.transactionFilter === "MONTH"
  ){

    addDayBuckets(
      chartStart,
      chartEnd,
    );

  }else if(
    props.transactionFilter === "YEAR"
  ){

    addMonthBuckets(
      chartStart,
      chartEnd,
    );

  }else{

    const durationInDays =
      Math.max(
        1,
        Math.ceil(
          (
            chartEnd.getTime()
            -
            chartStart.getTime()
          )
          /
          86400000,
        ),
      );


    if(durationInDays <= 45){

      addDayBuckets(
        chartStart,
        chartEnd,
      );

    }else if(durationInDays <= 1095){

      addMonthBuckets(
        chartStart,
        chartEnd,
      );

    }else{

      addYearBuckets(
        chartStart,
        chartEnd,
      );

    }

  }


  if(chartBuckets.length === 0){

    chartBuckets.push({
      key:
        "empty",

      label:
        props.transactionFilterLabel,

      shortLabel:
        props.transactionFilterLabel,

      start:
        chartStart.getTime(),

      end:
        chartEnd.getTime(),
    });

  }


  const dailyTotals =
    chartBuckets.map(
      (
        bucket,
        index,
      ) => {

        const amount =
          expenses
            .filter(
              (item:any) => {

                const timestamp =
                  new Date(
                    item.transactionDate,
                  ).getTime();


                return (
                  Number.isFinite(
                    timestamp,
                  )
                  &&
                  timestamp >= bucket.start
                  &&
                  timestamp < bucket.end
                );

              },
            )
            .reduce(
              (
                total:number,
                item:any,
              ) =>
                total
                +
                amountOf(
                  item,
                ),
              0,
            );


        return {
          day:
            index + 1,

          key:
            bucket.key,

          label:
            bucket.label,

          shortLabel:
            bucket.shortLabel,

          amount,
        };

      },
    );

  const daysInMonth =
    Math.max(
      dailyTotals.length,
      2,
    );

  const todaySparklineData =
    dailyTotals.length > 1
      ? dailyTotals.map(
        (item) =>
          item.amount,
      )
      : [
        0,
        dailyTotals[0]?.amount
        ??
        0,
      ];

  const monthSparklineData =
    todaySparklineData;

  const todayExpense =
    periodExpense;

  const monthExpense =
    periodExpense;

  const todayChange:
    number | null =
    null;

  const monthChange:
    number | null =
    null;

  const monthExpenses =
    expenses;

  const chartLabelStep =
    Math.max(
      1,
      Math.ceil(
        dailyTotals.length
        /
        6,
      ),
    );

  const categoryMap =
    new Map<string, number>();

  monthExpenses.forEach(
    (item:any) => {

      const name =
        String(
          item?.category?.name
          ||
          (language === "ms" ? "Lain-lain" : "Others"),
        ).trim()
        ||
        (language === "ms" ? "Lain-lain" : "Others");

      categoryMap.set(
        name,
        (
          categoryMap.get(
            name,
          )
          ||
          0
        )
        +
        amountOf(
          item,
        ),
      );

    },
  );

  const categories =
    Array.from(
      categoryMap.entries(),
    )
      .map(
        (
          [
            name,
            amount,
          ],
        ) => ({
          name,
          amount,
        }),
      )
      .sort(
        (
          first,
          second,
        ) =>
          second.amount
          -
          first.amount,
      );

  const visibleCategories =
    categories.slice(
      0,
      5,
    );

  if(categories.length > 5){

    visibleCategories.push({
      name:
        language === "ms" ? "Lain-lain" : "Others",

      amount:
        categories
          .slice(
            5,
          )
          .reduce(
            (
              total,
              item,
            ) =>
              total
              +
              item.amount,
            0,
          ),
    });

  }


  const colours = [
    "#079b83",
    "#36bea7",
    "#4384d8",
    "#f4b62d",
    "#8468cf",
    "#ef6c68",
  ];

  let accumulated =
    0;

  const donutStops =
    visibleCategories.map(
      (item, index) => {
        const percentage =
          monthExpense > 0
            ? (
              item.amount /
              monthExpense
            ) * 100
            : 0;

        const start =
          accumulated;

        accumulated +=
          percentage;

        return (
          `${colours[index % colours.length]} ` +
          `${start}% ${accumulated}%`
        );
      },
    );

  const donutBackground =
    monthExpense > 0
      ? `conic-gradient(${donutStops.join(",")})`
      : "conic-gradient(#e4edeb 0% 100%)";

  const chartWidth =
    760;

  const chartHeight =
    188;

  const chartPadding = {
    top:14,
    right:16,
    bottom:25,
    left:48,
  };

  const maxDaily =
    Math.max(
      ...dailyTotals.map(
        (item) => item.amount,
      ),
      1,
    );

  const chartMaximum =
    Math.ceil(
      maxDaily / 100,
    ) * 100 || 100;

  const xFor =
    (index:number) =>
      chartPadding.left +
      (
        index /
        Math.max(
          dailyTotals.length - 1,
          1,
        )
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
        amount / chartMaximum
      ) *
      (
        chartHeight -
        chartPadding.top -
        chartPadding.bottom
      );

  const chartPoints =
    dailyTotals.map(
      (item, index) => ({
        x:xFor(index),
        y:yFor(item.amount),
      }),
    );

  type SmoothPoint = {
    x:number;
    y:number;
  };

  const chartBottom =
    chartHeight - chartPadding.bottom;

  const clampChartY =
    (value:number) =>
      Math.min(
        chartBottom,
        Math.max(
          chartPadding.top,
          value,
        ),
      );

  const controlPoint = (
    current:SmoothPoint,
    previous:SmoothPoint | undefined,
    next:SmoothPoint | undefined,
    reverse = false,
  ):SmoothPoint => {
    const previousPoint =
      previous || current;

    const nextPoint =
      next || current;

    const smoothing =
      0.16;

    const length =
      Math.hypot(
        nextPoint.x - previousPoint.x,
        nextPoint.y - previousPoint.y,
      ) * smoothing;

    const angle =
      Math.atan2(
        nextPoint.y - previousPoint.y,
        nextPoint.x - previousPoint.x,
      ) +
      (
        reverse
          ? Math.PI
          : 0
      );

    return {
      x:
        current.x +
        Math.cos(angle) * length,
      y:clampChartY(
        current.y +
        Math.sin(angle) * length,
      ),
    };
  };

  const smoothLinePath =
    chartPoints.reduce(
      (
        pathValue,
        point,
        index,
        points,
      ) => {
        if (index === 0){
          return `M ${point.x} ${point.y}`;
        }

        const previousPoint =
          points[index - 1];

        const startControl =
          controlPoint(
            previousPoint,
            points[index - 2],
            point,
          );

        const endControl =
          controlPoint(
            point,
            previousPoint,
            points[index + 1],
            true,
          );

        return (
          `${pathValue} C ` +
          `${startControl.x} ${startControl.y}, ` +
          `${endControl.x} ${endControl.y}, ` +
          `${point.x} ${point.y}`
        );
      },
      "",
    );

  const smoothAreaPath =
    chartPoints.length > 0
      ? (
        `${smoothLinePath} ` +
        `L ${chartPoints[chartPoints.length - 1].x} ${chartBottom} ` +
        `L ${chartPoints[0].x} ${chartBottom} Z`
      )
      : "";

  const linkedMembers =
    members.filter(
      (member:any) =>
        Boolean(
          member?.whatsappPhoneNumber,
        ),
    ).length;

  const whatsappStatus =
    statusLabel(
      props.data?.whatsapp?.instance?.status,
      language,
    );

  async function handleSaveBotAlias(){

    if(!props.canManageWhatsApp){
      return;
    }

    const normalized =
      botAlias
        .trim()
        .replace(
          /^@+/,
          "",
        )
        .toLowerCase();

    if(
      normalized.length < 2
      ||
      normalized.length > 32
      ||
      !/^[a-z0-9._-]+$/.test(
        normalized,
      )
    ){

      setAliasMessage(
        language === "ms"
          ? "Alias mesti 2 hingga 32 aksara: huruf, nombor, titik, underscore atau dash."
          : "Alias must be 2 to 32 characters: letters, numbers, dot, underscore or dash.",
      );

      return;

    }

    setAliasSaving(true);
    setAliasMessage("");

    try{

      await props.onSaveWhatsAppAlias(
        normalized,
      );

      setBotAlias(
        normalized,
      );

      setAliasMessage(
        language === "ms"
          ? `Alias berjaya disimpan. Group trigger: @${normalized}`
          : `Alias saved. Group trigger: @${normalized}`,
      );

    }catch(error){

      setAliasMessage(
        error instanceof Error
          ? error.message
          : language === "ms"
            ? "Alias WhatsApp gagal disimpan."
            : "WhatsApp alias could not be saved.",
      );

    }finally{

      setAliasSaving(false);

    }

  }

  const google =
    props.data?.google || {};

  const sheetUrl =
    google.spreadsheetUrl ||
    google.workingSpreadsheetUrl ||
    google.url ||
    (
      google.spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${google.spreadsheetId}`
        : ""
    );

  const workspaceType =
    props.data?.me?.workspace?.type ||
    "PERSONAL";

  const monthLabel =
    now.toLocaleDateString(
      "en-MY",
      {
        month:"long",
        year:"numeric",
      },
    );

  const shortMonth =
    now.toLocaleDateString(
      "en-MY",
      {
        month:"short",
      },
    );

  return (
    <div className="pd-root">
      <style>{`
        .pd-legacy-hidden{display:none!important}
        .pd-root{display:flex;flex-direction:column;gap:14px;padding-bottom:24px}
        .pd-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .pd-metric,.pd-panel{border:1px solid #dae7e4;background:#fff;box-shadow:0 8px 30px rgba(10,57,55,.045)}
        .pd-metric{position:relative;display:flex;align-items:center;min-width:0;min-height:92px;padding:17px;border-radius:13px}
        .pd-icon{display:grid;flex:0 0 45px;width:45px;height:45px;margin-right:14px;place-items:center;border-radius:11px;background:#dcf7f1;color:#008f79}.pd-icon svg{display:block}
        .pd-metric-copy{display:flex;min-width:0;flex:1;flex-direction:column}
        .pd-eyebrow{margin-bottom:5px;color:#758b89;font-size:11px}
        .pd-metric strong{overflow:hidden;color:#102f31;font-size:19px;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}
        .pd-metric small{margin-top:6px;color:#809491;font-size:10px}
        .pd-spark{display:flex;width:90px;flex-direction:column;align-items:flex-end;gap:1px}
        .pd-spark svg{width:84px;height:32px}
        .pd-spark span{font-size:10px;font-weight:800}
        .pd-spark .increase{color:#ee5d64}
        .pd-spark .decrease{color:#009b6d}
        .pd-spark .neutral{color:#809491}
        .pd-health{display:inline-flex;align-items:center;gap:4px;margin-left:8px;padding:6px 9px;border-radius:999px;background:#e6f8ef;color:#159568;font-size:10px;font-weight:800}
        .pd-chart-grid,.pd-content-grid,.pd-bottom-grid{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(360px,1fr);gap:12px}.pd-chart-grid{align-items:start}.pd-chart-grid>.pd-panel:first-child{align-self:start;padding-bottom:11px}
        .pd-panel{min-width:0;border-radius:13px;padding:17px}
        .pd-panel-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
        .pd-panel-header h2{margin:0;color:#102f31;font-size:16px}
        .pd-mini-button,.pd-button{border:1px solid #d7e4e2;background:#fff;color:#264746;font-family:inherit;font-weight:700;cursor:pointer}
        .pd-mini-button{padding:6px 10px;border-radius:7px;font-size:10px}
        .pd-button{display:inline-flex;min-height:35px;align-items:center;justify-content:center;gap:6px;padding:8px 13px;border-radius:7px;font-size:11px}
        .pd-button.primary{border-color:#079b83;background:#079b83;color:#fff}
        .pd-button.danger{border-color:#f1c7ca;color:#e44953}
        .pd-button:disabled{cursor:not-allowed;opacity:.5}
        .pd-chart{display:block;width:100%;height:auto;max-height:188px}
        .pd-chart text{font-family:Inter,system-ui,sans-serif}
        .pd-donut-layout{display:grid;grid-template-columns:190px minmax(0,1fr);align-items:center;gap:20px;min-height:245px}
        .pd-donut{position:relative;width:176px;height:176px;margin:auto;border-radius:50%}
        .pd-donut:after{position:absolute;inset:36px;border-radius:50%;background:#fff;content:""}
        .pd-donut-centre{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .pd-donut-centre span{color:#738a87;font-size:10px}.pd-donut-centre strong{max-width:110px;color:#102f31;font-size:19px;text-align:center}
        .pd-legend{display:flex;flex-direction:column;gap:11px}
        .pd-legend-row{display:grid;grid-template-columns:9px minmax(0,1fr) auto 45px;align-items:center;gap:8px;color:#3f5d5b;font-size:11px}
        .pd-dot{width:8px;height:8px;border-radius:50%}.pd-legend-value{color:#203f3f;font-weight:700}.pd-legend-percent{text-align:right;color:#718784}
        .pd-total{display:flex;justify-content:space-between;margin-top:4px;padding-top:12px;border-top:1px solid #e3ecea;color:#102f31;font-size:12px;font-weight:800}
        .pd-filter-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 15px;margin-bottom:14px;border:1px solid #d9e7e4;border-radius:10px;background:#f8fbfa}
        .pd-filter-copy{display:grid;gap:2px}.pd-filter-copy strong{font-size:12px;color:#244946}.pd-filter-copy span{font-size:10px;color:#718784}
        .pd-filter-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
        .pd-filter-select,.pd-filter-date{border:1px solid #cbdedb;border-radius:7px;background:#fff;color:#193c3c;padding:8px 9px;font-family:inherit;font-size:10px;outline:none}
        .pd-filter-separator{font-size:10px;color:#718784}
        .pd-table-wrap{overflow-x:auto}.pd-table{width:100%;border-collapse:collapse;white-space:nowrap}
        .pd-table th{padding:9px 8px;border-bottom:1px solid #dde7e5;color:#6f8582;font-size:9px;text-align:left}
        .pd-table td{padding:8px;border-bottom:1px solid #e5edeb;color:#395655;font-size:10px}
        .pd-type{display:inline-flex;padding:3px 7px;border-radius:999px;font-size:8px;font-weight:800}
        .pd-type.expense{background:#ffe8ea;color:#f04e58}.pd-type.income{background:#dff8e9;color:#07975d}
        .pd-expense{color:#ed4954!important;font-weight:800}.pd-income{color:#07975d!important;font-weight:800}
        .pd-wa-layout{display:grid;grid-template-columns:205px minmax(0,1fr);gap:18px}
        .pd-status-list{display:flex;flex-direction:column;gap:11px}
        .pd-status-row{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;font-size:10px}
        .pd-status-row span{color:#748986}.pd-status-row strong{color:#193c3c}
        .pd-members{display:flex;flex-direction:column;gap:8px}
        .pd-member{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid #d7e9e5;border-radius:7px;background:#eef9f6}
        .pd-member-check{display:grid;width:19px;height:19px;place-items:center;border-radius:50%;background:#079b6e;color:#fff;font-size:10px}
        .pd-member strong{display:block;color:#173b3b;font-size:10px}.pd-member span{display:block;margin-top:2px;color:#77908d;font-size:8px}
        .pd-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
        .pd-alias-card{display:grid;gap:8px;margin-top:16px;padding:13px;border:1px solid #dce9e7;border-radius:9px;background:#f8fbfa}
        .pd-alias-card label{font-size:10px;font-weight:800;color:#193c3c}
        .pd-alias-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
        .pd-alias-input{width:100%;min-width:0;border:1px solid #cbdedb;border-radius:7px;background:#fff;color:#193c3c;padding:9px 10px;font-family:inherit;font-size:11px;outline:none}
        .pd-alias-input:focus{border-color:#079b83;box-shadow:0 0 0 3px rgba(7,155,131,.1)}
        .pd-alias-help{font-size:9px;line-height:1.5;color:#6e8582}
        .pd-alias-message{font-size:9px;font-weight:700;color:#376462}
        .pd-sheet{display:grid;grid-template-columns:245px minmax(0,1fr);gap:20px}
        .pd-sheet-info{display:grid;grid-template-columns:100px minmax(0,1fr);gap:9px;font-size:10px}
        .pd-sheet-info span{color:#758b88}.pd-sheet-info strong{color:#173a3a}
        .pd-url{overflow:hidden;margin-bottom:12px;padding:11px;border:1px solid #bde8df;border-radius:7px;background:#edfbf7;color:#057b69;font-size:9px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}
        .pd-quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .pd-quick{display:flex;min-height:112px;flex-direction:column;align-items:flex-start;padding:14px;border:1px solid #dce8e5;border-radius:9px;background:#fff;text-align:left;cursor:pointer}
        .pd-quick-icon{display:grid;width:37px;height:37px;margin-bottom:10px;place-items:center;border-radius:50%;background:#079b83;color:#fff}.pd-quick-icon svg{display:block}
        .pd-quick strong{color:#173b3b;font-size:11px}.pd-quick span{margin-top:5px;color:#758c89;font-size:9px;line-height:1.45}

        .pd-icon img {
          display:block;
          width:30px;
          height:30px;
          object-fit:contain;
        }

        .pd-panel-title {
          display:flex;
          min-width:0;
          align-items:center;
          gap:8px;
        }

        .pd-panel-title img {
          display:block;
          width:23px;
          height:23px;
          object-fit:contain;
        }

        .pd-panel-title h2 {
          margin:0;
        }

        .pd-quick-icon.pd-quick-image {
          overflow:visible;
          background:transparent;
        }

        .pd-quick-image img {
          display:block;
          width:42px;
          height:42px;
          object-fit:contain;
        }

        .pd-disconnect-image {
          display:block;
          width:17px;
          height:17px;
          object-fit:contain;
        }

        @media(max-width:720px){.pd-filter-bar{align-items:stretch}.pd-filter-controls{display:grid;grid-template-columns:1fr}.pd-filter-select,.pd-filter-date{width:100%}.pd-filter-separator{display:none}}
        @media(max-width:1200px){.pd-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pd-chart-grid,.pd-content-grid,.pd-bottom-grid{grid-template-columns:1fr}}
        @media(max-width:520px){.pd-alias-row{grid-template-columns:1fr}.pd-alias-row .pd-button{width:100%}}
        @media(max-width:720px){.pd-metrics{grid-template-columns:1fr}.pd-donut-layout,.pd-wa-layout,.pd-sheet{grid-template-columns:1fr}.pd-quick-grid{grid-template-columns:1fr}.pd-spark{width:72px}.pd-panel{padding:14px}.pd-legend-row{grid-template-columns:9px minmax(0,1fr) auto}.pd-legend-percent{display:none}}
      `}</style>

      <section className="pd-filter-bar">
        <div className="pd-filter-copy">
          <strong>
            {text.transactionPeriod}
          </strong>

          <span>
            {props.transactionFilterLabel} · {transactions.length} {transactions.length === 1 ? text.record : text.records}
          </span>
        </div>

        <div className="pd-filter-controls">
          <select
            className="pd-filter-select"
            value={props.transactionFilter}
            aria-label="Dashboard transaction period"
            onChange={(event) =>
              props.onTransactionFilterChange(
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

          {props.transactionFilter === "CUSTOM" && (
            <>
              <input
                className="pd-filter-date"
                type="date"
                value={props.transactionCustomFrom}
                aria-label="Dashboard transaction date from"
                onChange={(event) =>
                  props.onTransactionCustomFromChange(
                    event.target.value,
                  )
                }
              />

              <span className="pd-filter-separator">
                to
              </span>

              <input
                className="pd-filter-date"
                type="date"
                value={props.transactionCustomTo}
                aria-label="Dashboard transaction date to"
                onChange={(event) =>
                  props.onTransactionCustomToChange(
                    event.target.value,
                  )
                }
              />
            </>
          )}
        </div>
      </section>

      <section className="pd-metrics">
        <MetricCard
          icon="wallet"
          label={`${props.transactionFilterLabel} ${text.expense}`}
          value={currency(periodExpense)}
          subtitle={`${transactions.length} ${transactions.length === 1 ? text.filteredTransaction : text.filteredTransactions}`}
          trend={null}
          sparklineData={todaySparklineData}
        />

        <MetricCard
          icon="calendar"
          label={`${props.transactionFilterLabel} ${text.income}`}
          value={currency(periodIncome)}
          subtitle={`${text.balance} ${currency(periodBalance)}`}
          trend={null}
          sparklineData={monthSparklineData}
        />

        <MetricCard
          icon="whatsapp"
          label="WhatsApp"
          value={whatsappStatus}
          subtitle={`${linkedMembers} / ${members.length} ${text.membersLinked}`}
          status={
            whatsappStatus === text.connected
              ? text.healthy
              : undefined
          }
        />

        <MetricCard
          icon="sheet"
          label="Google Sheet"
          value={
            google.spreadsheetId
              ? text.connected
              : text.notConnected
          }
          subtitle={
            google.spreadsheetTitle ||
            text.myPocketWorkspace
          }
          status={
            google.spreadsheetId
              ? text.live
              : undefined
          }
        />
      </section>

      <section className="pd-chart-grid">
        <DashboardPanel
          title={`${text.expenseTrend} · ${props.transactionFilterLabel}`}
        >
          <svg
            className="pd-chart"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={`${text.expenseTrend} ${props.transactionFilterLabel}`}
          >
            <defs>
              <linearGradient
                id="pd-area"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#079b83"
                  stopOpacity=".23"
                />
                <stop
                  offset="100%"
                  stopColor="#079b83"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[0, .25, .5, .75, 1].map(
              (guide) => {
                const value =
                  chartMaximum * guide;

                const y =
                  yFor(value);

                return (
                  <g key={guide}>
                    <line
                      x1={chartPadding.left}
                      y1={y}
                      x2={chartWidth - chartPadding.right}
                      y2={y}
                      stroke="#e4ecea"
                    />

                    <text
                      x={chartPadding.left - 9}
                      y={y + 3}
                      fill="#718784"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {Math.round(value)}
                    </text>
                  </g>
                );
              },
            )}

            <path
              d={smoothAreaPath}
              fill="url(#pd-area)"
            />

            <path
              d={smoothLinePath}
              fill="none"
              stroke="#079b83"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
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
              .map((item) => (
                <circle
                  key={item.day}
                  cx={xFor(item.day - 1)}
                  cy={yFor(item.amount)}
                  r="3.2"
                  fill="#fff"
                  stroke="#079b83"
                  strokeWidth="2.2"
                >
                  <title>
                    {`${item.label}: ${currency(item.amount)}`}
                  </title>
                </circle>
              ))}

            {dailyTotals
              .map(
                (
                  item,
                  index,
                ) => ({
                  item,
                  index,
                }),
              )
              .filter(
                ({ index }) =>
                  index % chartLabelStep === 0
                  ||
                  index === dailyTotals.length - 1,
              )
              .map(
                (
                  {
                    item,
                    index,
                  },
                ) => (
                  <text
                    key={`${item.key}-label`}
                    x={xFor(index)}
                    y={chartHeight - 9}
                    fill="#718784"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {item.shortLabel}
                  </text>
                ),
              )}
          </svg>
        </DashboardPanel>

        <DashboardPanel
          title={`${text.spendingByCategory} · ${props.transactionFilterLabel}`}
        >
          <div className="pd-donut-layout">
            <div
              className="pd-donut"
              style={{
                background:donutBackground,
              }}
            >
              <div className="pd-donut-centre">
                <span>RM</span>
                <strong>
                  {monthExpense.toLocaleString(
                    locale,
                    {
                      minimumFractionDigits:2,
                    },
                  )}
                </strong>
                <span>{text.total}</span>
              </div>
            </div>

            <div className="pd-legend">
              {visibleCategories.map(
                (item, index) => {
                  const percentage =
                    monthExpense > 0
                      ? (
                        item.amount /
                        monthExpense
                      ) * 100
                      : 0;

                  return (
                    <div
                      className="pd-legend-row"
                      key={`${item.name}-${index}`}
                    >
                      <span
                        className="pd-dot"
                        style={{
                          background:
                            colours[
                              index % colours.length
                            ],
                        }}
                      />

                      <span>{item.name}</span>

                      <span className="pd-legend-value">
                        {currency(item.amount)}
                      </span>

                      <span className="pd-legend-percent">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  );
                },
              )}

              <div className="pd-total">
                <span>{text.total}</span>
                <span>{currency(monthExpense)}</span>
              </div>
            </div>
          </div>
        </DashboardPanel>
      </section>

      <section className="pd-content-grid">
        <DashboardPanel
          title={`${text.recentTransactions} · ${props.transactionFilterLabel}`}
          action={{
            label:text.viewAll,
            onClick:props.onOpenTransactions,
          }}
        >
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>{text.date}</th>
                  <th>{text.type}</th>
                  <th>{text.category}</th>
                  <th>{text.merchant}</th>
                  <th>{text.amount}</th>
                  <th>{text.source}</th>
                  <th>{text.recordedBy}</th>
                </tr>
              </thead>

              <tbody>
                {transactions
                  .slice(0, 10)
                  .map((item:any) => {
                    const itemType =
                      String(
                        item.type || "EXPENSE",
                      ).toLowerCase();

                    return (
                      <tr key={item.id}>
                        <td>
                          {new Date(
                            item.transactionDate,
                          ).toLocaleString("en-MY")}
                        </td>

                        <td>
                          <span
                            className={`pd-type ${itemType}`}
                          >
                            {item.type}
                          </span>
                        </td>

                        <td>
                          {item.category?.name || "-"}
                        </td>

                        <td>
                          {item.merchant?.name || "-"}
                        </td>

                        <td
                          className={
                            itemType === "income"
                              ? "pd-income"
                              : "pd-expense"
                          }
                        >
                          {currency(
                            item.amount,
                            item.currency || "MYR",
                          )}
                        </td>

                        <td>


                          {item.source || "SYSTEM"}


                        </td>


                        <td>


                          {


                            item.createdBy?.name


                            ||


                            item.createdBy?.email


                            ||


                            item.createdByEmail


                            ||


                            (


                              props.data.members


                              ||


                              []


                            ).find(


                              (member:any) =>


                                member.userId === item.createdById,


                            )?.name


                            ||


                            (


                              props.data.members


                              ||


                              []


                            ).find(


                              (member:any) =>


                                member.userId === item.createdById,


                            )?.email


                            ||


                            "-"


                          }


                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title={text.whatsappIntegration}
          titleImage="/dashboard-icons/whatsapp-logo.png"
          action={{
            label:text.manage,
            onClick:props.onOpenWhatsApp,
          }}
        >
          <div className="pd-wa-layout">
            <div className="pd-status-list">
              <div className="pd-status-row">
                <span>{text.instance}</span>
                <strong>
                  {props.data?.whatsapp?.instance?.instanceName ||
                    "imai.dev"}
                </strong>
              </div>

              <div className="pd-status-row">
                <span>{text.status}</span>
                <strong>● {whatsappStatus}</strong>
              </div>
              <div className="pd-status-row">
                <span>{text.trigger}</span>
                <strong>
                  @{currentBotAlias} / !
                </strong>
              </div>


              <div className="pd-status-row">
                <span>{text.members}</span>
                <strong>
                  {linkedMembers} / {members.length} {text.membersLinked}
                </strong>
              </div>

              <div className="pd-status-row">
                <span>{text.lastSync}</span>
                <strong>
                  {new Date().toLocaleString("en-MY")}
                </strong>
              </div>
            </div>

            <div className="pd-members">
              {members
                .slice(0, 4)
                .map((member:any) => (
                  <div
                    className="pd-member"
                    key={member.memberId}
                  >
                    <span className="pd-member-check">
                      <AppIcon
                        name="check"
                        size={13}
                        strokeWidth={2.2}
                      />
                    </span>

                    <div>
                      <strong>
                        {member.role}{" "}
                        {member.name || member.email}
                      </strong>

                      <span>
                        {member.whatsappPhoneNumber ||
                          text.notLinked}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

            {props.canManageWhatsApp && (
              <form
                className="pd-alias-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveBotAlias();
                }}
              >
                <label htmlFor="pd-whatsapp-bot-alias">
                  {text.aliasLabel}
                </label>

                <div className="pd-alias-row">
                  <input
                    id="pd-whatsapp-bot-alias"
                    className="pd-alias-input"
                    value={botAlias}
                    maxLength={33}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="mypocket"
                    aria-label={text.aliasLabel}
                    onChange={(event) =>
                      setBotAlias(
                        event.target.value,
                      )
                    }
                  />

                  <button
                    type="submit"
                    className="pd-button primary"
                    disabled={
                      aliasSaving
                      ||
                      botAlias.trim().length < 2
                    }
                  >
                    {aliasSaving
                      ? text.saving
                      : text.saveAlias}
                  </button>
                </div>

                <span className="pd-alias-help">
                  {text.aliasHelp.replace(
                    "{alias}",
                    botAlias.trim() || currentBotAlias,
                  )}
                </span>

                {aliasMessage && (
                  <span
                    className="pd-alias-message"
                    aria-live="polite"
                  >
                    {aliasMessage}
                  </span>
                )}
              </form>
            )}

          <div className="pd-actions">
            <button
              className="pd-button danger"
              onClick={props.onOpenWhatsApp}
            >
              <img
                className="pd-disconnect-image"
                src="/dashboard-icons/disconnect-whatsapp.png"
                alt=""
                aria-hidden="true"
              />

              {text.disconnectWhatsApp}
            </button>

            <button
              className="pd-button"
              onClick={props.onRefresh}
            >
              <AppIcon
                name="refresh"
                size={14}
                strokeWidth={2}
              />
              {text.recheckStatus}
            </button>
          </div>
        </DashboardPanel>
      </section>

      <section className="pd-bottom-grid">
        <DashboardPanel
          title={text.googleSheet}
          titleImage="/dashboard-icons/google-sheets-logo.png"
        >
          <div className="pd-sheet">
            <div className="pd-sheet-info">
              <span>{text.workspacePackage}</span>
              <strong>{workspaceType}</strong>
              <span>{text.template}</span>
              <strong>
                {google.templateType ||
                  text.notConnected}
              </strong>

              <span>{text.title}</span>
              <strong>
                {google.spreadsheetTitle ||
                  "-"}
              </strong>
              <span>{text.mode}</span>
              <strong>
                {google.mode || "AUTO_CREATED"}
              </strong>

              <span>{text.lastUpdated}</span>
              <strong>
                {new Date().toLocaleString("en-MY")}
              </strong>
            </div>
            <div>
              {google.templateType &&
                google.templateType !== workspaceType && (
                  <div className="pd-warning">
                    Workspace package sekarang ialah {workspaceType}, tetapi Google Sheet
                    masih menggunakan template {google.templateType}. Tekan button upgrade
                    untuk create Google Sheet baru ikut package semasa. Sheet lama tidak
                    dipadam dan kekal dalam Google Drive anda.
                  </div>
                )}

              <div className="pd-url">
                {sheetUrl ||
                  text.sheetNotConnected}
              </div>

              <div className="pd-actions">
                <button
                  className="pd-button primary"
                  disabled={!sheetUrl}
                  onClick={() => {
                    if (sheetUrl){
                      window.open(
                        sheetUrl,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }
                  }}
                >
                  <AppIcon
                    name="external"
                    size={14}
                  />
                  {text.openGoogleSheet}
                </button>

                <button
                  className="pd-button"
                  onClick={props.onRelinkGoogle}
                >
                  <AppIcon
                    name="link"
                    size={14}
                  />
                  {text.relinkGoogleAccess}
                </button>

                <button
                  className="pd-button"
                  onClick={props.onRecreateGoogle}
                >
                  <AppIcon
                    name="rotate"
                    size={14}
                  />
                  {google.templateType &&

                  google.templateType !== workspaceType

                    ? `${text.upgradeGoogleSheetTo} ${workspaceType}`

                    : text.recreateGoogleSheet}
                </button>
              </div>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title={text.quickActions}>
          <div className="pd-quick-grid">
            <button
              className="pd-quick"
              onClick={props.onAddTransaction}
            >
              
              <span className="pd-quick-icon pd-quick-image">
                <img
                  src="/dashboard-icons/add-transaction.png"
                  alt={text.addTransaction}
                />
              </span>
              <strong>{text.addTransaction}</strong>
              <span>
                {text.useWhatsAppCommand}
              </span>
            </button>

            <button
              className="pd-quick"
              onClick={props.onOpenWhatsApp}
            >
              
              <span className="pd-quick-icon pd-quick-image">
                <img
                  src="/dashboard-icons/disconnect-whatsapp.png"
                  alt={text.disconnectWhatsApp}
                />
              </span>
              <strong>{text.disconnectWhatsApp}</strong>
              <span>
                {language === "ms" ? "Putuskan bot semasa sebelum pair semula." : "Disconnect the current bot before pairing again."}
              </span>
            </button>

            <button
              className="pd-quick"
              onClick={props.onSetup}
            >
              
              <span className="pd-quick-icon pd-quick-image">
                <img
                  src="/dashboard-icons/setup-wizard.png"
                  alt={text.setupWizard}
                />
              </span>
              <strong>{text.setupWizard}</strong>
              <span>
                {text.reviewOnboarding}
              </span>
            </button>
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}
