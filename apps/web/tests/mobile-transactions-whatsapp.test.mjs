import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(
  new URL("../src/app-bootstrap.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../src/financial-focus.css", import.meta.url),
  "utf8",
);

test("mobile transactions use a complete compact card layout without horizontal scrolling", () => {
  assert.match(app, /className="tableWrap transactionsTableWrap"/);
  assert.match(app, /className="transactionsTable"/);
  for (const className of [
    "transactionDateCell",
    "transactionTypeCell",
    "transactionCategoryCell",
    "transactionMerchantCell",
    "transactionReferenceCell",
    "transactionAmountCell",
    "transactionSourceCell",
    "transactionRecordedByCell",
  ]) {
    assert.match(app, new RegExp(`className=[^{\\n]*[\\s\\S]{0,80}${className}`));
  }
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.transactionsTableWrap\s*\{[\s\S]*?overflow-x:\s*visible/);
  assert.match(css, /\.transactionsTable tbody tr\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.transactionReferenceCell/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test("the round mobile WhatsApp action targets the paired bot with only an exclamation mark", () => {
  assert.match(app, /buildWhatsAppBotUrl/);
  assert.match(app, /props\.data\.whatsapp\?\.instance\?\.phoneNumber/);
  assert.doesNotMatch(app, /whatsAppShortcutAlias/);
  assert.match(app, /mobileWhatsAppUrl\s*\?/);
  assert.match(app, /href=\{mobileWhatsAppUrl\}/);
});
