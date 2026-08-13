import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/app-bootstrap.tsx", import.meta.url),
  "utf8",
);


test("Bot Settings exposes and saves the workspace receipt PDF preference", () => {
  assert.match(source, /receiptPdfEnabled:boolean/);
  assert.match(source, /receiptPdfEnabled,\s*\n/);
  assert.match(source, /checked=\{receiptPdfEnabled\}/);
  assert.match(source, /setReceiptPdfEnabled\(event\.target\.checked\)/);
});
