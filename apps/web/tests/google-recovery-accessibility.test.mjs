import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const sources = [
  "src/premium-dashboard.tsx",
  "src/app-bootstrap.tsx",
].map((path) =>
  readFileSync(
    new URL(`../${path}`, import.meta.url),
    "utf8",
  ),
);

test(
  "advanced Google recovery URL fields expose explicit accessible names",
  () => {
    for(const source of sources){
      assert.match(
        source,
        /aria-label="Advanced Google Drive Folder URL"/,
      );
      assert.match(
        source,
        /aria-label="Advanced Working Google Sheet URL"/,
      );
      assert.match(
        source,
        /aria-label="Advanced Backup Google Sheet URL \(optional\)"/,
      );
    }
  },
);
