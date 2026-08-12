import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const focusStyles = await readFile(
  new URL("../src/financial-focus.css", import.meta.url),
  "utf8",
);

const promotionSource = await readFile(
  new URL("../src/promo-code-settings.tsx", import.meta.url),
  "utf8",
);

test("promotion controls retain semantic native checkboxes at a compact size", () => {
  assert.match(promotionSource, /input type="checkbox"/);
  assert.match(
    focusStyles,
    /\.appShell \.promo-admin-form input\[type="checkbox"\]\s*\{[\s\S]*?width:\s*18px;[\s\S]*?height:\s*18px;[\s\S]*?min-height:\s*18px;[\s\S]*?accent-color:\s*var\(--ff-green-dark\);/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.promo-admin-form fieldset label\s*\{[\s\S]*?align-items:\s*center;[\s\S]*?min-height:\s*32px;/,
  );
});

test("Super Admin user table uses the light MyPocket ledger theme", () => {
  assert.match(
    focusStyles,
    /\.appShell \.superAdminMain \.admin-users-table thead th\s*\{[\s\S]*?color:\s*#31564d;[\s\S]*?background:\s*var\(--ff-context\);/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.superAdminMain \.admin-users-table tbody td\s*\{[\s\S]*?color:\s*var\(--ff-ink\);[\s\S]*?border-bottom-color:\s*var\(--ff-line\);/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.superAdminMain :is\([\s\S]*?\.admin-user-identity strong,[\s\S]*?\)\s*\{[\s\S]*?color:\s*var\(--ff-ink-strong\);/,
  );
});

test("tablet and mobile Super Admin cards cannot fall back to the legacy dark palette", () => {
  assert.match(
    focusStyles,
    /@media \(max-width: 1180px\)[\s\S]*?\.appShell \.superAdminMain \.admin-users-table tbody tr,[\s\S]*?background:\s*#ffffff;/,
  );
  assert.match(
    focusStyles,
    /@media \(max-width: 720px\)[\s\S]*?\.appShell \.superAdminMain \.admin-user-identity strong\s*\{[\s\S]*?color:\s*var\(--ff-ink-strong\);/,
  );
});

test("all Super Admin root panels share the same final surface rule", () => {
  assert.match(
    focusStyles,
    /\.appShell \.appFullWidthGrid > :is\([\s\S]*?\.admin-users-shell,[\s\S]*?\.promo-admin-shell,[\s\S]*?\.billingAdminPanel[\s\S]*?\)\s*\{[\s\S]*?border-radius:\s*8px;[\s\S]*?background:\s*#ffffff;/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.main\.superAdminMain\s*> section\.grid\.appFullWidthGrid\.superAdminGrid\s*> \.admin-users-shell\s*\{[\s\S]*?width:\s*100%\s*!important;[\s\S]*?margin:\s*0\s*!important;/,
  );
});

test("Super Admin modal keeps distinct warning and destructive actions", () => {
  assert.match(
    focusStyles,
    /\.appShell \.admin-modal-button\.warning\s*\{[\s\S]*?color:\s*#744408;[\s\S]*?background:\s*#fff7e7;/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.admin-modal-button\.danger\s*\{[\s\S]*?color:\s*#8f2635;[\s\S]*?background:\s*var\(--ff-red-soft\);/,
  );
});
