export type DashboardTransactionFilterMode =
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "YEAR"
  | "ALL"
  | "CUSTOM";

export type DashboardDateRange = {
  start:Date | null;
  end:Date | null;
};

export type DashboardTransactionLike = {
  amount:string | number;
  type:string;
  transactionDate:string;
  category?:{ name?:string | null } | null;
  merchant?:{ name?:string | null } | null;
};

export type DashboardTransactionSummary = {
  transactionCount:number;
  expenseCount:number;
  incomeCount:number;
  expense:number;
  income:number;
  balance:number;
};

export type DashboardRankedAmount = {
  name:string;
  amount:number;
};

type CalendarDate = {
  year:number;
  month:number;
  day:number;
};

type ZonedDateTime = CalendarDate & {
  hour:number;
  minute:number;
  second:number;
};

const DEFAULT_TIME_ZONE =
  "Asia/Kuala_Lumpur";

function safeTimeZone(
  timeZone:string | null | undefined,
){
  const candidate =
    String(timeZone || DEFAULT_TIME_ZONE).trim()
    || DEFAULT_TIME_ZONE;

  try{
    new Intl.DateTimeFormat(
      "en-US",
      { timeZone:candidate },
    ).format(new Date(0));
    return candidate;
  }catch{
    return DEFAULT_TIME_ZONE;
  }
}

function partsInTimeZone(
  date:Date,
  timeZone:string,
):ZonedDateTime{
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:safeTimeZone(timeZone),
        year:"numeric",
        month:"2-digit",
        day:"2-digit",
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit",
        hourCycle:"h23",
      },
    );

  const values =
    new Map(
      formatter
        .formatToParts(date)
        .map((part) => [
          part.type,
          part.value,
        ]),
    );

  return {
    year:Number(values.get("year")),
    month:Number(values.get("month")),
    day:Number(values.get("day")),
    hour:Number(values.get("hour")),
    minute:Number(values.get("minute")),
    second:Number(values.get("second")),
  };
}

function calendarDate(
  year:number,
  month:number,
  day:number,
):CalendarDate{
  const normalized =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  return {
    year:normalized.getUTCFullYear(),
    month:normalized.getUTCMonth() + 1,
    day:normalized.getUTCDate(),
  };
}

function addCalendarDays(
  value:CalendarDate,
  days:number,
){
  return calendarDate(
    value.year,
    value.month,
    value.day + days,
  );
}

function addCalendarMonths(
  value:CalendarDate,
  months:number,
){
  return calendarDate(
    value.year,
    value.month + months,
    1,
  );
}

function startOfZonedDay(
  value:CalendarDate,
  timeZone:string,
){
  const zone =
    safeTimeZone(timeZone);
  const targetAsUtc =
    Date.UTC(
      value.year,
      value.month - 1,
      value.day,
    );
  let timestamp =
    targetAsUtc;

  for(let attempt = 0; attempt < 4; attempt += 1){
    const represented =
      partsInTimeZone(
        new Date(timestamp),
        zone,
      );
    const representedAsUtc =
      Date.UTC(
        represented.year,
        represented.month - 1,
        represented.day,
        represented.hour,
        represented.minute,
        represented.second,
      );
    const correction =
      targetAsUtc - representedAsUtc;

    timestamp += correction;

    if(correction === 0){
      break;
    }
  }

  return new Date(timestamp);
}

function parseDateInput(
  value:string,
):CalendarDate | null{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){
    return null;
  }

  const [year, month, day] =
    value.split("-").map(Number);
  const normalized =
    calendarDate(year, month, day);

  if(
    normalized.year !== year
    || normalized.month !== month
    || normalized.day !== day
  ){
    return null;
  }

  return normalized;
}

export function dashboardDateInputValue(
  date:Date,
  timeZone:string = DEFAULT_TIME_ZONE,
){
  const parts =
    partsInTimeZone(
      date,
      timeZone,
    );

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function resolveDashboardDateRange(
  mode:DashboardTransactionFilterMode,
  customFrom:string,
  customTo:string,
  timeZone:string = DEFAULT_TIME_ZONE,
  referenceDate:Date = new Date(),
):DashboardDateRange{
  if(mode === "ALL"){
    return {
      start:null,
      end:null,
    };
  }

  const zone =
    safeTimeZone(timeZone);
  const reference =
    partsInTimeZone(
      referenceDate,
      zone,
    );
  const today:CalendarDate = {
    year:reference.year,
    month:reference.month,
    day:reference.day,
  };

  if(mode === "TODAY"){
    return {
      start:startOfZonedDay(today, zone),
      end:startOfZonedDay(addCalendarDays(today, 1), zone),
    };
  }

  if(mode === "WEEK"){
    const weekday =
      new Date(
        Date.UTC(
          today.year,
          today.month - 1,
          today.day,
        ),
      ).getUTCDay();
    const mondayOffset =
      (weekday + 6) % 7;
    const start =
      addCalendarDays(today, -mondayOffset);

    return {
      start:startOfZonedDay(start, zone),
      end:startOfZonedDay(addCalendarDays(start, 7), zone),
    };
  }

  if(mode === "MONTH"){
    const start:CalendarDate = {
      year:today.year,
      month:today.month,
      day:1,
    };

    return {
      start:startOfZonedDay(start, zone),
      end:startOfZonedDay(addCalendarMonths(start, 1), zone),
    };
  }

  if(mode === "YEAR"){
    const start:CalendarDate = {
      year:today.year,
      month:1,
      day:1,
    };

    return {
      start:startOfZonedDay(start, zone),
      end:startOfZonedDay({
        year:today.year + 1,
        month:1,
        day:1,
      }, zone),
    };
  }

  let from =
    parseDateInput(customFrom);
  let to =
    parseDateInput(customTo);

  if(
    from
    && to
    && Date.UTC(from.year, from.month - 1, from.day)
      > Date.UTC(to.year, to.month - 1, to.day)
  ){
    [from, to] = [to, from];
  }

  return {
    start:from
      ? startOfZonedDay(from, zone)
      : null,
    end:to
      ? startOfZonedDay(addCalendarDays(to, 1), zone)
      : null,
  };
}

export function resolvePreviousDashboardDateRange(
  mode:DashboardTransactionFilterMode,
  range:DashboardDateRange,
  timeZone:string = DEFAULT_TIME_ZONE,
):DashboardDateRange | null{
  if(
    mode === "ALL"
    || !range.start
    || !range.end
  ){
    return null;
  }

  const zone =
    safeTimeZone(timeZone);
  const startParts =
    partsInTimeZone(range.start, zone);
  const start:CalendarDate = {
    year:startParts.year,
    month:startParts.month,
    day:startParts.day,
  };

  if(mode === "TODAY"){
    const previous =
      addCalendarDays(start, -1);
    return {
      start:startOfZonedDay(previous, zone),
      end:range.start,
    };
  }

  if(mode === "WEEK"){
    const previous =
      addCalendarDays(start, -7);
    return {
      start:startOfZonedDay(previous, zone),
      end:range.start,
    };
  }

  if(mode === "MONTH"){
    const previous =
      addCalendarMonths(start, -1);
    return {
      start:startOfZonedDay(previous, zone),
      end:range.start,
    };
  }

  if(mode === "YEAR"){
    return {
      start:startOfZonedDay({
        year:start.year - 1,
        month:1,
        day:1,
      }, zone),
      end:range.start,
    };
  }

  const duration =
    range.end.getTime()
    - range.start.getTime();

  return {
    start:new Date(range.start.getTime() - duration),
    end:range.start,
  };
}

export function transactionMatchesDashboardRange(
  transaction:Pick<DashboardTransactionLike, "transactionDate">,
  range:DashboardDateRange,
){
  const timestamp =
    new Date(transaction.transactionDate).getTime();

  if(!Number.isFinite(timestamp)){
    return false;
  }

  return !(
    range.start
    && timestamp < range.start.getTime()
  ) && !(
    range.end
    && timestamp >= range.end.getTime()
  );
}

export function filterDashboardTransactions<
  T extends DashboardTransactionLike
>(
  transactions:T[],
  range:DashboardDateRange,
){
  return transactions.filter(
    (transaction) =>
      transactionMatchesDashboardRange(
        transaction,
        range,
      ),
  );
}

export function summarizeDashboardTransactions(
  transactions:DashboardTransactionLike[],
):DashboardTransactionSummary{
  let expense = 0;
  let income = 0;
  let expenseCount = 0;
  let incomeCount = 0;

  for(const transaction of transactions){
    const amount =
      Number(transaction.amount) || 0;
    const type =
      String(transaction.type).toUpperCase();

    if(type === "INCOME"){
      income += amount;
      incomeCount += 1;
    }else if(type === "EXPENSE"){
      expense += amount;
      expenseCount += 1;
    }
  }

  return {
    transactionCount:expenseCount + incomeCount,
    expenseCount,
    incomeCount,
    expense,
    income,
    balance:income - expense,
  };
}

export function dashboardPercentageChange(
  current:number,
  previous:number,
):number | null{
  if(previous === 0){
    return current === 0
      ? 0
      : null;
  }

  return (
    (current - previous)
    / Math.abs(previous)
  ) * 100;
}

export function rankDashboardExpenses(
  transactions:DashboardTransactionLike[],
  group:"category" | "merchant",
  fallbackName:string,
):DashboardRankedAmount[]{
  const totals =
    new Map<string, number>();

  for(const transaction of transactions){
    if(String(transaction.type).toUpperCase() !== "EXPENSE"){
      continue;
    }

    const name =
      String(transaction[group]?.name || fallbackName).trim()
      || fallbackName;
    totals.set(
      name,
      (totals.get(name) || 0)
      + (Number(transaction.amount) || 0),
    );
  }

  return Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((first, second) =>
      second.amount - first.amount
      || first.name.localeCompare(second.name)
    );
}

export function topDashboardAmounts(
  values:DashboardRankedAmount[],
  limit:number,
  othersName:string,
){
  if(values.length <= limit){
    return values;
  }

  return [
    ...values.slice(0, limit),
    {
      name:othersName,
      amount:values
        .slice(limit)
        .reduce(
          (total, item) => total + item.amount,
          0,
        ),
    },
  ];
}
