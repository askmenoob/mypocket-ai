import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

function setupWizardSource(component) {
  const start = component.indexOf("function SetupWizard(");
  const end = component.indexOf("function TransactionFilterControls(");

  assert.ok(start >= 0, "SetupWizard component must exist");
  assert.ok(end > start, "SetupWizard component boundary must exist");

  return component.slice(start, end);
}

test("setup wizard is a five-step Malay journey with resumable progress", async () => {
  const component = await readFile(
    new URL("src/app-bootstrap.tsx", appRoot),
    "utf8",
  );
  const wizard = setupWizardSource(component);

  for (const step of [
    "Mula",
    "Google",
    "Ruang kewangan",
    "WhatsApp",
    "Sedia digunakan",
  ]) {
    assert.match(wizard, new RegExp(`label:\\s*"${step}"`));
  }

  assert.match(wizard, /Langkah \{step \+ 1\} daripada \{wizardSteps\.length\}/);
  assert.match(wizard, /localStorage\.setItem\(\s*STORAGE\.wizardStep/);
  assert.match(wizard, /Jom sediakan MyPocket anda/);
  assert.match(wizard, /Sambungkan akaun Google/);
  assert.match(wizard, /Buat kemudian/);
  assert.match(wizard, /Buka dashboard/);

  assert.doesNotMatch(wizard, /current === "Terms"/);
  assert.doesNotMatch(wizard, /current === "Subscription"/);
});

test("setup wizard scopes friendly Google guidance to the Google step", async () => {
  const component = await readFile(
    new URL("src/app-bootstrap.tsx", appRoot),
    "utf8",
  );
  const wizard = setupWizardSource(component);

  assert.match(wizard, /Google belum disambungkan/);
  assert.match(wizard, /currentStep\.id === "google"/);
  assert.match(wizard, /props\.state\.error/);
  assert.match(wizard, /Data anda kekal milik anda/);
});

test("setup wizard reuses the landing brand assets and has a mobile progress layout", async () => {
  const [component, styles, mascot, mark] = await Promise.all([
    readFile(new URL("src/app-bootstrap.tsx", appRoot), "utf8"),
    readFile(new URL("src/setup-wizard.css", appRoot), "utf8"),
    stat(new URL("public/mypocket-robot-wave.webp", appRoot)),
    stat(new URL("public/mypocket-mark.png", appRoot)),
  ]);
  const wizard = setupWizardSource(component);

  assert.match(wizard, /src="\/mypocket-robot-wave\.webp"/);
  assert.match(wizard, /src="\/mypocket-mark\.png"/);
  assert.match(styles, /\.wizardMobileProgress/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(5,1fr\)/);
  assert.ok(mascot.size > 100_000);
  assert.ok(mark.size > 10_000);
});

test("completed users can explicitly reopen and close the setup wizard", async () => {
  const component = await readFile(
    new URL("src/app-bootstrap.tsx", appRoot),
    "utf8",
  );
  const resetStart = component.indexOf("function resetWizard()");
  const resetEnd = component.indexOf("async function installApp()", resetStart);
  const needsStart = component.indexOf("const needsWizard =");
  const needsEnd = component.indexOf("const qrSecondsLeft", needsStart);

  assert.ok(resetStart >= 0 && resetEnd > resetStart);
  assert.ok(needsStart >= 0 && needsEnd > needsStart);

  const resetWizard = component.slice(resetStart, resetEnd);
  const needsWizard = component.slice(needsStart, needsEnd);

  assert.match(resetWizard, /setWizardRequested\(true\)/);
  assert.match(needsWizard, /wizardRequested/);
  assert.match(component, /setWizardRequested\(false\)/);
});
