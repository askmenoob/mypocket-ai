import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";

import {
  AIProviderRouter,
} from "../../src/modules/intelligence/index.js";
import type {
  AITextProvider,
} from "../../src/modules/intelligence/index.js";
import {
  WhatsAppCommandParser,
} from "../../src/modules/whatsapp/whatsapp-command.parser.js";
import {
  WhatsAppService,
} from "../../src/modules/whatsapp/whatsapp.service.js";
import type {
  ParsedWhatsAppTransaction,
} from "../../src/modules/whatsapp/whatsapp.types.js";

type ExpectedTransaction = Partial<
  Pick<
    ParsedWhatsAppTransaction,
    "amount" | "type" | "categoryName" | "paymentMethodName"
  >
>;

type BenchmarkCase = {
  id:string;
  text:string;
  expectedIntent:string;
  expectedTransaction?:ExpectedTransaction;
};

const TRANSACTION_DATE =
  "2026-08-11T01:00:00.000Z";

const CASES:BenchmarkCase[] = [
  {id:"help-bm", text:"bantuan", expectedIntent:"help"},
  {id:"summary-bm", text:"ringkasan bulan", expectedIntent:"query:summary:month"},
  {id:"search-manglish", text:"cari petrol", expectedIntent:"query:search"},
  {id:"last-bm", text:"transaksi terakhir", expectedIntent:"query:last"},
  {id:"delete-bm", text:"padam 2", expectedIntent:"delete"},
  {id:"edit-bm", text:"ubah terakhir jumlah RM20", expectedIntent:"edit"},
  {id:"correction-manglish", text:"edit last nota makan dengan client", expectedIntent:"edit"},
  {id:"commitment-create-bm", text:"ingatkan astro RM120 15hb", expectedIntent:"commitment:create"},
  {id:"commitment-list-bm", text:"senarai komitmen", expectedIntent:"commitment:list_all"},
  {id:"commitment-delete-bm", text:"padam komitmen astro", expectedIntent:"commitment:archive"},
  {id:"commitment-paid-bm", text:"bayar komitmen astro", expectedIntent:"commitment:mark_paid"},
  {
    id:"expense-food-bm",
    text:"makan nasi lemak RM8.50 cash",
    expectedIntent:"transaction",
    expectedTransaction:{amount:"8.50", type:"EXPENSE", categoryName:"Food", paymentMethodName:"Cash"},
  },
  {
    id:"expense-transport-manglish",
    text:"isi minyak RM50 guna kad",
    expectedIntent:"transaction",
    expectedTransaction:{amount:"50", type:"EXPENSE", categoryName:"Transport", paymentMethodName:"Card"},
  },
  {
    id:"income-bm",
    text:"gaji masuk RM3000 bank",
    expectedIntent:"transaction",
    expectedTransaction:{amount:"3000", type:"INCOME", categoryName:"Salary", paymentMethodName:"Bank"},
  },
  {
    id:"shopping-manglish",
    text:"beli buku RM20 dekat popular",
    expectedIntent:"transaction",
    expectedTransaction:{amount:"20", type:"EXPENSE", categoryName:"Shopping"},
  },
  {
    id:"amount-words-bm",
    text:"tapau mamak dua belas ringgit cash",
    expectedIntent:"transaction",
    expectedTransaction:{amount:"12", type:"EXPENSE", categoryName:"Food", paymentMethodName:"Cash"},
  },
  {
    id:"income-words-bm",
    text:"duit masuk seratus ringgit bank",
    expectedIntent:"transaction",
    expectedTransaction:{amount:"100", type:"INCOME", categoryName:"Salary", paymentMethodName:"Bank"},
  },
  {
    id:"amount-words-manglish",
    text:"bayar bil elektrik ninety ringgit",
    expectedIntent:"transaction",
    expectedTransaction:{amount:"90", type:"EXPENSE", categoryName:"Bills"},
  },
];

const service =
  new WhatsAppService({} as never) as any;

function normalizedEvolutionText(
  item:BenchmarkCase,
){
  const normalized = service.normalizeEvolutionPayload({
    event:"messages.upsert",
    instance:"benchmark",
    data:{
      key:{
        fromMe:false,
        remoteJid:"60123456789@s.whatsapp.net",
        id:item.id,
      },
      message:{conversation:item.text},
    },
  });

  assert.equal(normalized.accepted, true);
  assert.equal(normalized.messageType, "text");
  return String(normalized.text ?? "");
}

function classifyIntent(
  text:string,
){
  const clean = text.trim().replace(/^!+\s*/, "");

  if(WhatsAppCommandParser.isHelp(clean)) return "help";

  const summary = WhatsAppCommandParser.summaryPeriod(clean);
  if(summary) return `query:summary:${summary}`;

  const list = WhatsAppCommandParser.list(clean);
  if(list?.mode === "search") return "query:search";
  if(list) return `query:list:${list.period ?? "today"}`;
  if(WhatsAppCommandParser.isLast(clean)) return "query:last";
  if(WhatsAppCommandParser.deleteTransaction(clean)) return "delete";
  if(WhatsAppCommandParser.editLast(clean)) return "edit";

  const commitment = service.parseReminderCommand(clean);
  if(commitment) return `commitment:${commitment.action}`;

  return "transaction";
}

function deterministicParse(
  text:string,
){
  return service.parseTransactionText(
    text,
    TRANSACTION_DATE,
  ) as ParsedWhatsAppTransaction;
}

function expectedProviderValue(
  item:BenchmarkCase,
):ParsedWhatsAppTransaction{
  assert.ok(item.expectedTransaction);

  return {
    amount:item.expectedTransaction.amount!,
    currency:"MYR",
    type:item.expectedTransaction.type!,
    categoryName:item.expectedTransaction.categoryName!,
    paymentMethodName:item.expectedTransaction.paymentMethodName,
    description:item.text,
    transactionDate:TRANSACTION_DATE,
    rawText:item.text,
  };
}

class FixtureTextProvider
implements AITextProvider<ParsedWhatsAppTransaction> {
  readonly name = "fixture-one-provider";
  readonly capabilities = ["text"] as const;
  calls = 0;

  isAvailable(){
    return true;
  }

  async parseTransaction(input:{text:string}){
    this.calls += 1;
    const item = CASES.find((candidate) => candidate.text === input.text);

    if(!item?.expectedTransaction){
      return {
        status:"invalid" as const,
        provider:this.name,
        reason:"FIXTURE_NOT_A_TRANSACTION",
      };
    }

    return {
      status:"success" as const,
      provider:this.name,
      value:expectedProviderValue(item),
    };
  }
}

function transactionMatches(
  actual:ParsedWhatsAppTransaction,
  expected:ExpectedTransaction,
){
  return Object.entries(expected).every(
    ([key, value]) => actual[key as keyof ParsedWhatsAppTransaction] === value,
  );
}

async function scoreCurrentPath(){
  let correct = 0;
  const failed:string[] = [];

  for(const item of CASES){
    const text = normalizedEvolutionText(item);
    const intent = classifyIntent(text);
    let itemCorrect = intent === item.expectedIntent;

    if(itemCorrect && item.expectedTransaction){
      try{
        itemCorrect = transactionMatches(
          deterministicParse(text),
          item.expectedTransaction,
        );
      }catch{
        itemCorrect = false;
      }
    }

    if(itemCorrect) correct += 1;
    else failed.push(item.id);
  }

  return {correct, failed};
}

async function scoreOneProviderPath(){
  const provider = new FixtureTextProvider();
  const router = new AIProviderRouter<ParsedWhatsAppTransaction>([provider]);
  let correct = 0;
  const failed:string[] = [];
  const attemptStatuses:string[] = [];

  for(const item of CASES){
    const text = normalizedEvolutionText(item);
    const intent = classifyIntent(text);
    let itemCorrect = intent === item.expectedIntent;

    if(itemCorrect && item.expectedTransaction){
      const routed = await router.parseTransaction(
        {text, transactionDate:TRANSACTION_DATE, currency:"MYR"},
        () => deterministicParse(text),
      );
      itemCorrect = transactionMatches(routed.value, item.expectedTransaction);
      attemptStatuses.push(...routed.attempts.map((attempt) => attempt.status));
    }

    if(itemCorrect) correct += 1;
    else failed.push(item.id);
  }

  return {correct, failed, providerCalls:provider.calls, attemptStatuses};
}

async function meanLatencyMs(
  runner:(item:BenchmarkCase) => unknown | Promise<unknown>,
  iterations = 100,
){
  const started = performance.now();
  for(let iteration = 0; iteration < iterations; iteration += 1){
    for(const item of CASES){
      try{
        await runner(item);
      }catch{
        // Failed parses are part of the current-path benchmark.
      }
    }
  }
  return (performance.now() - started) / (iterations * CASES.length);
}

test("Sprint K BM/Manglish benchmark compares current and one-provider paths safely", async () => {
  const current = await scoreCurrentPath();
  const providerResult = await scoreOneProviderPath();
  const transactionCases = CASES.filter((item) => item.expectedTransaction);

  const currentLatencyMs = await meanLatencyMs((item) => {
    const text = normalizedEvolutionText(item);
    if(classifyIntent(text) === "transaction") deterministicParse(text);
  });

  const latencyProvider = new FixtureTextProvider();
  const latencyRouter = new AIProviderRouter<ParsedWhatsAppTransaction>([latencyProvider]);
  const oneProviderLatencyMs = await meanLatencyMs(async (item) => {
    const text = normalizedEvolutionText(item);
    if(classifyIntent(text) === "transaction"){
      await latencyRouter.parseTransaction(
        {text, transactionDate:TRANSACTION_DATE, currency:"MYR"},
        () => deterministicParse(text),
      );
    }
  });

  const report = {
    fixtureCount:CASES.length,
    transactionFixtureCount:transactionCases.length,
    current:{
      correct:current.correct,
      accuracy:Number((current.correct / CASES.length).toFixed(4)),
      failed:current.failed,
      meanLocalLatencyMs:Number(currentLatencyMs.toFixed(4)),
      externalProviderCallsPerRun:0,
    },
    oneProviderSimulation:{
      correct:providerResult.correct,
      accuracy:Number((providerResult.correct / CASES.length).toFixed(4)),
      failed:providerResult.failed,
      meanLocalLatencyMs:Number(oneProviderLatencyMs.toFixed(4)),
      externalProviderCallsPerRun:providerResult.providerCalls,
      inputCharactersPerRun:transactionCases.reduce((sum, item) => sum + item.text.length, 0),
      realNetworkMeasured:false,
      realProviderCostMeasured:false,
    },
  };

  console.log(`SPRINT_K_BENCHMARK:${JSON.stringify(report)}`);

  assert.equal(current.correct, 15);
  assert.deepEqual(current.failed, [
    "amount-words-bm",
    "income-words-bm",
    "amount-words-manglish",
  ]);
  assert.equal(providerResult.correct, CASES.length);
  assert.equal(providerResult.providerCalls, transactionCases.length);
  assert.ok(providerResult.attemptStatuses.every((status) => status === "success"));
  assert.equal(latencyProvider.calls, transactionCases.length * 100);
});
