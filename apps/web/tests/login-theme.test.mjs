import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(
  new URL("../src/app-bootstrap.tsx", import.meta.url),
  "utf8",
);

const styles = await readFile(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

test("login uses the leaning mascot and one themed Google action", () => {
  const tokenGate = app.slice(
    app.indexOf("function TokenGate("),
    app.indexOf("type WizardStepId"),
  );

  assert.match(tokenGate, /mypocket-login-mascot-safe-v3\.png/);
  assert.match(tokenGate, /mypocket-mascot-login-mobile\.png/);
  assert.match(tokenGate, /className="loginMascot"/);
  assert.doesNotMatch(tokenGate, /mypocket-login-safe\.png/);
  assert.doesNotMatch(tokenGate, /className="loginSafetyBox"/);
  assert.equal((tokenGate.match(/className="googleButton"/g) ?? []).length, 1);
  assert.doesNotMatch(tokenGate, /Install PWA on phone/);
  assert.doesNotMatch(tokenGate, /API:/);
});

test("login mascot and Google action have responsive themed styling", () => {
  assert.match(styles, /\.loginMascotPicture\s*\{[\s\S]*position:absolute/);
  assert.match(styles, /\.googleButton\s*\{[\s\S]*#006f4c/);
  assert.match(styles, /@media\(max-width:720px\)[\s\S]*\.loginMascotPicture\s*\{/);
});

test("workspace loading uses a dedicated responsive mascot card", () => {
  assert.match(app, /className="workspaceLoadingCard"/);
  assert.match(app, /mypocket-robot-wave\.webp/);
  assert.match(app, /className="workspaceLoadingProgress"/);
  assert.match(app, /aria-live="polite"/);
  assert.match(styles, /\.workspaceLoadingCard\s*\{/);
  assert.match(
    styles,
    /@media\(max-width:720px\)[\s\S]*\.workspaceLoadingCard\s*\{/,
  );
});
