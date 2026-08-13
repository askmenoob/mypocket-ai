import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  WhatsAppCommandParser,
} from "../../src/modules/whatsapp/whatsapp-command.parser.js";
import {
  WhatsAppService,
} from "../../src/modules/whatsapp/whatsapp.service.js";

const source = async (relativePath:string) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

function webhookPayload(text:string){
  return {
    event:"messages.upsert",
    instance:"sprint-k",
    data:{
      key:{
        fromMe:false,
        remoteJid:"60123456789@s.whatsapp.net",
        id:"sprint-k-message",
      },
      message:{conversation:text},
    },
  };
}

test("Evolution remains transport while help stays a read-only MyPocket action", async () => {
  let financialWrites = 0;
  const replies:string[] = [];
  const app = {
    prisma:{
      whatsAppInstance:{
        findUnique:async () => ({
          workspaceId:"workspace-a",
          instanceName:"sprint-k",
          botAlias:"bot",
        }),
      },
      workspaceBotSettings:{
        findUnique:async () => ({replyLanguage:"ms"}),
      },
    },
  };
  const service = new WhatsAppService(app as any) as any;
  service.safeSendWebhookReply = async (_normalized:unknown, reply:string) => {
    replies.push(reply);
  };
  service.transactionService = {
    createTransaction:async () => {
      financialWrites += 1;
      throw new Error("help must not execute a transaction");
    },
  };

  const result = await service.handleEvolutionWebhook(webhookPayload("!bantuan"));

  assert.equal(result.message, "WhatsApp help sent");
  assert.equal(financialWrites, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /bot|mypocket/i);
});

test("multi-turn draft state is isolated by both workspace and actor", () => {
  const service = new WhatsAppService({} as any) as any;
  const commitmentKey = service.commitmentDraftKey("workspace-a", "user-a");
  const receiptKey = service.receiptDraftKey("workspace-a", "user-a");

  assert.equal(commitmentKey, receiptKey);
  assert.notEqual(commitmentKey, service.commitmentDraftKey("workspace-b", "user-a"));
  assert.notEqual(commitmentKey, service.commitmentDraftKey("workspace-a", "user-b"));

  service.commitmentDrafts.set(commitmentKey, {step:"name"});
  service.receiptDrafts.set(receiptKey, {status:"pending"});

  assert.equal(
    service.commitmentDrafts.get(service.commitmentDraftKey("workspace-b", "user-a")),
    undefined,
  );
  assert.equal(
    service.receiptDrafts.get(service.receiptDraftKey("workspace-a", "user-b")),
    undefined,
  );
});

test("BM and Manglish mutation intents remain explicit and role-gated", () => {
  const service = new WhatsAppService({} as any) as any;

  assert.deepEqual(
    WhatsAppCommandParser.deleteTransaction("padam 3"),
    {number:3},
  );
  assert.deepEqual(
    WhatsAppCommandParser.editLast("edit last jumlah RM25"),
    {field:"amount", value:"RM25"},
  );
  assert.deepEqual(
    service.parseReminderCommand("ingatkan astro RM120 15hb"),
    {action:"create", name:"astro", amount:"120", dueDay:15},
  );
  assert.deepEqual(
    service.parseReminderCommand("bayar komitmen astro"),
    {action:"mark_paid", name:"astro"},
  );
  assert.deepEqual(
    service.parseReminderCommand("selesai reminder internet"),
    {action:"mark_paid", name:"internet"},
  );
  assert.equal(
    service.parseReminderCommand("bayar bil elektrik RM90"),
    null,
  );
  assert.equal(service.canUseWhatsAppCommand("MEMBER", "help"), true);
  assert.equal(service.canUseWhatsAppCommand("MEMBER", "reminder"), true);
  assert.equal(service.canUseWhatsAppCommand("MEMBER", "edit"), false);
  assert.equal(service.canUseWhatsAppCommand("MEMBER", "delete"), false);
});

test("income understanding is parsing-only until MyPocket executes after authorization", () => {
  const service = new WhatsAppService({} as any) as any;
  const parsed = service.parseTransactionText(
    "gaji masuk RM3000 bank",
    "2026-08-11T01:00:00.000Z",
  );

  assert.equal(parsed.type, "INCOME");
  assert.equal(parsed.categoryName, "Salary");
  assert.equal(parsed.amount, "3000");
  assert.equal(parsed.paymentMethodName, "Bank");
});

test("text AI and router cannot write finances directly", async () => {
  const [router, provider, service] = await Promise.all([
    source("../../src/modules/intelligence/ai-provider.router.ts"),
    source("../../src/modules/intelligence/groq-text.provider.ts"),
    source("../../src/modules/whatsapp/whatsapp.service.ts"),
  ]);
  const prohibited = /\.prisma\b|TransactionService|CommitmentService|createTransaction|updateTransaction|deleteTransaction|googleapis/i;

  assert.doesNotMatch(router, prohibited);
  assert.doesNotMatch(provider, prohibited);
  assert.match(service, /new TransactionService/);
  assert.match(service, /canUseWhatsAppCommand/);
  assert.match(service, /transactionService\s*\.createTransaction/);
});

test("receipt extraction remains on its separate vision confirmation boundary", async () => {
  const [textProvider, receiptPipeline, service] = await Promise.all([
    source("../../src/modules/intelligence/groq-text.provider.ts"),
    source("../../src/modules/whatsapp/whatsapp-receipt.pipeline.ts"),
    source("../../src/modules/whatsapp/whatsapp.service.ts"),
  ]);

  assert.doesNotMatch(textProvider, /ReceiptVision|receiptUrl|GoogleDriveReceiptStorage/);
  assert.match(receiptPipeline, /ReceiptVisionProvider/);
  assert.match(receiptPipeline, /visionProvider\.extractReceipt/);
  assert.match(service, /new GroqVisionProvider/);
  assert.match(service, /handleReceiptDraftMessage/);
  assert.match(service, /RECEIPT_DRAFT_TTL_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
});
