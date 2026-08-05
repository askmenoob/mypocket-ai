export type TemplateSettings =
  Record<string, string>;


const textValue = (
  value:unknown,
) =>
  value === null ||
  value === undefined
    ? ""
    : String(value).trim();


export function parseTemplateSettings(
  rows:unknown[][],
):TemplateSettings{

  const settings:
    TemplateSettings = {};

  for(const row of rows){

    const key =
      textValue(
        row[0],
      ).toLowerCase();

    if(!key){
      continue;
    }

    settings[key] =
      textValue(
        row[1],
      );

  }

  return settings;

}


export function findTemplateSettingRow(
  rows:unknown[][],
  key:string,
):number{

  const expected =
    key.trim().toLowerCase();

  const index =
    rows.findIndex(
      (row) =>
        textValue(
          row[0],
        ).toLowerCase() === expected,
    );

  return index < 0
    ? -1
    : index + 1;

}


function parseVersion(
  value:string,
):number[]{

  const normalized =
    value.trim();

  if(!/^\d+(?:\.\d+){0,2}$/.test(
    normalized,
  )){
    throw new Error(
      `Invalid template version: ${value}`,
    );
  }

  const parts =
    normalized
      .split(".")
      .map(Number);

  while(parts.length < 3){
    parts.push(0);
  }

  return parts;

}


export function compareTemplateVersions(
  left:string,
  right:string,
):number{

  const leftParts =
    parseVersion(
      left,
    );

  const rightParts =
    parseVersion(
      right,
    );

  for(let index = 0; index < 3; index += 1){

    if(leftParts[index] < rightParts[index]){
      return -1;
    }

    if(leftParts[index] > rightParts[index]){
      return 1;
    }

  }

  return 0;

}


export function normalizeSheetRow(
  row:unknown[],
  width:number,
):string[]{

  return Array.from(
    {
      length:
        width,
    },
    (
      _,
      index,
    ) =>
      textValue(
        row[index],
      ),
  );

}


function amountToCents(
  value:unknown,
):number{

  const normalized =
    textValue(
      value,
    )
      .replace(
        /,/g,
        "",
      )
      .replace(
        /[^0-9.-]/g,
        "",
      );

  if(!normalized){
    return 0;
  }

  const amount =
    Number(
      normalized,
    );

  if(!Number.isFinite(amount)){
    throw new Error(
      `Invalid transaction amount: ${value}`,
    );
  }

  return Math.round(
    amount * 100,
  );

}


export type TransactionSnapshot = {
  header:string[];
  recordCount:number;
  transactionIds:string[];
  duplicateIds:string[];
  totalAmountCents:number;
};


export function buildTransactionSnapshot(
  rows:unknown[][],
):TransactionSnapshot{

  const header =
    normalizeSheetRow(
      rows[0] ?? [],
      15,
    );

  const transactionIds:
    string[] = [];

  let totalAmountCents =
    0;

  for(const row of rows.slice(1)){

    const transactionId =
      textValue(
        row[0],
      );

    if(!transactionId){
      continue;
    }

    transactionIds.push(
      transactionId,
    );

    totalAmountCents +=
      amountToCents(
        row[7],
      );

  }

  transactionIds.sort();

  const duplicateIds =
    transactionIds.filter(
      (
        transactionId,
        index,
      ) =>
        index > 0
        &&
        transactionIds[index - 1]
          === transactionId,
    );

  return {
    header,
    recordCount:
      transactionIds.length,
    transactionIds,
    duplicateIds:
      Array.from(
        new Set(
          duplicateIds,
        ),
      ),
    totalAmountCents,
  };

}


export function sameTransactionSnapshot(
  left:TransactionSnapshot,
  right:TransactionSnapshot,
):boolean{

  return (
    left.recordCount
      === right.recordCount
    &&
    left.totalAmountCents
      === right.totalAmountCents
    &&
    JSON.stringify(
      left.header,
    )
      ===
      JSON.stringify(
        right.header,
      )
    &&
    JSON.stringify(
      left.transactionIds,
    )
      ===
      JSON.stringify(
        right.transactionIds,
      )
  );

}
