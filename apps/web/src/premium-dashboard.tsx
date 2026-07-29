import { AppIcon } from "./app-icon";
type PremiumDashboardProps = {
  data:any;
  onRefresh:() => void;
  onSetup:() => void;
  onRelinkGoogle:() => void;
  onRecreateGoogle:() => void;
  onOpenTransactions:() => void;
  onOpenWhatsApp:() => void;
  onAddTransaction:() => void;
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
) => {
  const status =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    status.includes("CONNECTED") ||
    status === "READY" ||
    status === "OPEN"
  ){
    return "Connected";
  }

  if (
    status.includes("DISCONNECT") ||
    status.includes("CLOSE")
  ){
    return "Disconnected";
  }

  return value
    ? String(value)
    : "Checking";
};

const dashboardImageIcons:Record<string, string> = {
  whatsapp:"/dashboard-icons/whatsapp-logo.png",
  sheet:"/dashboard-icons/google-sheets-logo.png",
};

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
  const transactions =
    Array.isArray(props.data?.transactions)
      ? props.data.transactions
      : [];

  const members =
    Array.isArray(props.data?.members)
      ? props.data.members
      : [];

  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

  const yesterday =
    new Date(today);

  yesterday.setDate(
    yesterday.getDate() - 1,
  );

  const expenses =
    transactions.filter(
      (item:any) =>
        String(item?.type).toUpperCase() === "EXPENSE",
    );

  const amountOf =
    (item:any) =>
      Number(item?.amount) || 0;

  const todayExpense =
    expenses
      .filter((item:any) =>
        sameDay(
          new Date(item.transactionDate),
          today,
        ),
      )
      .reduce(
        (total:number, item:any) =>
          total + amountOf(item),
        0,
      );

  const yesterdayExpense =
    expenses
      .filter((item:any) =>
        sameDay(
          new Date(item.transactionDate),
          yesterday,
        ),
      )
      .reduce(
        (total:number, item:any) =>
          total + amountOf(item),
        0,
      );

  const monthExpenses =
    expenses.filter(
      (item:any) => {
        const date =
          new Date(item.transactionDate);

        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      },
    );

  const todaySparklineData =
    Array.from(
      {
        length:8,
      },
      () => 0,
    );

  expenses
    .filter(
      (item:any) =>
        sameDay(
          new Date(item.transactionDate),
          today,
        ),
    )
    .forEach(
      (item:any) => {
        const date =
          new Date(item.transactionDate);

        const bucket =
          Math.min(
            7,
            Math.floor(
              date.getHours() / 3,
            ),
          );

        todaySparklineData[bucket] +=
          amountOf(item);
      },
    );

  const previousMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

  const previousMonthExpense =
    expenses
      .filter((item:any) => {
        const date =
          new Date(item.transactionDate);

        return (
          date.getFullYear() ===
            previousMonth.getFullYear() &&
          date.getMonth() ===
            previousMonth.getMonth()
        );
      })
      .reduce(
        (total:number, item:any) =>
          total + amountOf(item),
        0,
      );

  const monthExpense =
    monthExpenses.reduce(
      (total:number, item:any) =>
        total + amountOf(item),
      0,
    );

  const percentageChange =
    (
      current:number,
      previous:number,
    ):number | null => {
      if (previous <= 0){
        return null;
      }

      return (
        (current - previous) /
        previous
      ) * 100;
    };

  const todayChange =
    percentageChange(
      todayExpense,
      yesterdayExpense,
    );

  const monthChange =
    percentageChange(
      monthExpense,
      previousMonthExpense,
    );

  const daysInMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
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

  monthExpenses.forEach(
    (item:any) => {
      const date =
        new Date(item.transactionDate);

      const index =
        date.getDate() - 1;

      if (
        index >= 0 &&
        index < dailyTotals.length
      ){
        dailyTotals[index].amount +=
          amountOf(item);
      }
    },
  );

  const monthSparklineData =
    dailyTotals
      .slice(
        0,
        Math.max(
          now.getDate(),
          2,
        ),
      )
      .map(
        (item) =>
          item.amount,
      );

  const categoryMap =
    new Map<string, number>();

  monthExpenses.forEach(
    (item:any) => {
      const name =
        String(
          item?.category?.name ||
          "Others",
        ).trim() || "Others";

      categoryMap.set(
        name,
        (categoryMap.get(name) || 0) +
          amountOf(item),
      );
    },
  );

  const categories =
    Array.from(
      categoryMap.entries(),
    )
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort(
        (first, second) =>
          second.amount - first.amount,
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
    );

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

        @media(max-width:1200px){.pd-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pd-chart-grid,.pd-content-grid,.pd-bottom-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.pd-metrics{grid-template-columns:1fr}.pd-donut-layout,.pd-wa-layout,.pd-sheet{grid-template-columns:1fr}.pd-quick-grid{grid-template-columns:1fr}.pd-spark{width:72px}.pd-panel{padding:14px}.pd-legend-row{grid-template-columns:9px minmax(0,1fr) auto}.pd-legend-percent{display:none}}
      `}</style>

      <section className="pd-metrics">
        <MetricCard
          icon="wallet"
          label="Today Expense"
          value={currency(todayExpense)}
          subtitle="vs yesterday"
          trend={todayChange}
          sparklineData={todaySparklineData}
        />

        <MetricCard
          icon="calendar"
          label="This Month"
          value={currency(monthExpense)}
          subtitle="vs last month"
          trend={monthChange}
          sparklineData={monthSparklineData}
        />

        <MetricCard
          icon="whatsapp"
          label="WhatsApp"
          value={whatsappStatus}
          subtitle={`${linkedMembers} / ${members.length} members linked`}
          status={
            whatsappStatus === "Connected"
              ? "Healthy"
              : undefined
          }
        />

        <MetricCard
          icon="sheet"
          label="Google Sheet"
          value={
            google.spreadsheetId
              ? "Connected"
              : "Not connected"
          }
          subtitle={
            google.spreadsheetTitle ||
            "MyPocket workspace"
          }
          status={
            google.spreadsheetId
              ? "Live"
              : undefined
          }
        />
      </section>

      <section className="pd-chart-grid">
        <DashboardPanel title="Expense Trend">
          <svg
            className="pd-chart"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={`Expense trend for ${monthLabel}`}
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
                    {`${item.day} ${shortMonth}: ${currency(item.amount)}`}
                  </title>
                </circle>
              ))}

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
                  y={chartHeight - 9}
                  fill="#718784"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {day} {shortMonth}
                </text>
              ))}
          </svg>
        </DashboardPanel>

        <DashboardPanel title="Spending by Category">
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
                    "en-MY",
                    {
                      minimumFractionDigits:2,
                    },
                  )}
                </strong>
                <span>Total</span>
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
                <span>Total</span>
                <span>{currency(monthExpense)}</span>
              </div>
            </div>
          </div>
        </DashboardPanel>
      </section>

      <section className="pd-content-grid">
        <DashboardPanel
          title="Recent Transactions"
          action={{
            label:"View all",
            onClick:props.onOpenTransactions,
          }}
        >
          <div className="pd-table-wrap">
            <table className="pd-table">
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
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="WhatsApp Integration"
          titleImage="/dashboard-icons/whatsapp-logo.png"
          action={{
            label:"Manage",
            onClick:props.onOpenWhatsApp,
          }}
        >
          <div className="pd-wa-layout">
            <div className="pd-status-list">
              <div className="pd-status-row">
                <span>Instance</span>
                <strong>
                  {props.data?.whatsapp?.instance?.instanceName ||
                    "imai.dev"}
                </strong>
              </div>

              <div className="pd-status-row">
                <span>Status</span>
                <strong>● {whatsappStatus}</strong>
              </div>

              <div className="pd-status-row">
                <span>Members</span>
                <strong>
                  {linkedMembers} / {members.length} linked
                </strong>
              </div>

              <div className="pd-status-row">
                <span>Last Sync</span>
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
                          "belum linked"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

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

              Disconnect WhatsApp
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
              Recheck status
            </button>
          </div>
        </DashboardPanel>
      </section>

      <section className="pd-bottom-grid">
        <DashboardPanel
          title="Google Sheet"
          titleImage="/dashboard-icons/google-sheets-logo.png"
        >
          <div className="pd-sheet">
            <div className="pd-sheet-info">
              <span>Workspace package</span>
              <strong>{workspaceType}</strong>
              <span>Template</span>
              <strong>
                {google.templateType ||
                  "Not connected"}
              </strong>

              <span>Title</span>
              <strong>
                {google.spreadsheetTitle ||
                  "-"}
              </strong>
              <span>Mode</span>
              <strong>
                {google.mode || "AUTO_CREATED"}
              </strong>

              <span>Last Updated</span>
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
                  "Google Sheet is not connected"}
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
                  Open Google Sheet
                </button>

                <button
                  className="pd-button"
                  onClick={props.onRelinkGoogle}
                >
                  <AppIcon
                    name="link"
                    size={14}
                  />
                  Relink Google Access
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

                    ? `Upgrade Google Sheet to ${workspaceType}`

                    : "Recreate Google Sheet"}
                </button>
              </div>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Quick Actions">
          <div className="pd-quick-grid">
            <button
              className="pd-quick"
              onClick={props.onAddTransaction}
            >
              
              <span className="pd-quick-icon pd-quick-image">
                <img
                  src="/dashboard-icons/add-transaction.png"
                  alt="Add Transaction"
                />
              </span>
              <strong>Add Transaction</strong>
              <span>
                Use WhatsApp message command.
              </span>
            </button>

            <button
              className="pd-quick"
              onClick={props.onOpenWhatsApp}
            >
              
              <span className="pd-quick-icon pd-quick-image">
                <img
                  src="/dashboard-icons/disconnect-whatsapp.png"
                  alt="Disconnect WhatsApp"
                />
              </span>
              <strong>Disconnect WhatsApp</strong>
              <span>
                Putuskan bot semasa sebelum pair semula.
              </span>
            </button>

            <button
              className="pd-quick"
              onClick={props.onSetup}
            >
              
              <span className="pd-quick-icon pd-quick-image">
                <img
                  src="/dashboard-icons/setup-wizard.png"
                  alt="Setup Wizard"
                />
              </span>
              <strong>Setup Wizard</strong>
              <span>
                Review onboarding steps.
              </span>
            </button>
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}
