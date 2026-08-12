import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardSource = await readFile(
  new URL("../src/premium-dashboard.tsx", import.meta.url),
  "utf8",
);

const focusStyles = await readFile(
  new URL("../src/financial-focus.css", import.meta.url),
  "utf8",
);

test("financial dashboard gives recent transactions and WhatsApp stable layout hooks", () => {
  assert.equal(
    (dashboardSource.match(/className="pd-recent-transactions-panel"/g) || []).length,
    1,
  );
  assert.equal(
    (dashboardSource.match(/className="pd-whatsapp-panel"/g) || []).length,
    1,
  );
});

test("WhatsApp integration occupies the rail directly below transaction period", () => {
  assert.match(
    focusStyles,
    /\.appShell \.pd-filter-bar\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*1;/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.pd-panel\.pd-whatsapp-panel\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*2 \/ span 4;/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.pd-content-grid\s*\{\s*display:\s*contents;/,
  );
});

test("dashboard spacing and narrow WhatsApp content are responsive", () => {
  assert.match(
    focusStyles,
    /\.appShell \.pd-focus-dashboard\s*\{[\s\S]*?gap:\s*24px 32px;/,
  );
  assert.match(
    focusStyles,
    /\.appShell \.pd-whatsapp-panel \.pd-wa-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/,
  );
  assert.match(
    focusStyles,
    /@media \(max-width: 1320px\)[\s\S]*?\.appShell \.pd-panel\.pd-whatsapp-panel\s*\{[\s\S]*?grid-column:\s*1;[\s\S]*?grid-row:\s*3;/,
  );
  assert.match(
    focusStyles,
    /@media \(max-width: 720px\)[\s\S]*?\.appShell \.pd-focus-dashboard\s*\{[\s\S]*?gap:\s*16px;/,
  );
});
