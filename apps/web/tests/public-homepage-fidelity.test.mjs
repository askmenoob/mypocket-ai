import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

test("public homepage keeps the accepted mascot hero and scrollytelling contract", async () => {
  const [component, styles, mascot, mark] = await Promise.all([
    readFile(new URL("src/public-landing.tsx", appRoot), "utf8"),
    readFile(new URL("src/public-landing.css", appRoot), "utf8"),
    stat(new URL("public/mypocket-robot-wave.webp", appRoot)),
    stat(new URL("public/mypocket-mark.png", appRoot)),
  ]);

  assert.match(component, /className="mpHeroLine">Your money,/);
  assert.match(component, /className="mpHeroLine">organised\. Right/);
  assert.match(component, /from <em>WhatsApp\.<\/em>/);
  assert.match(component, /src="\/mypocket-robot-wave\.webp"/);
  assert.match(component, /src="\/mypocket-mark\.png"/);
  assert.match(component, /data-story-step/);
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /supportsIntersectionObserver/);
  assert.match(styles, /position: sticky/);
  assert.match(styles, /\.mpStoryStatic \.mpScrollyStep/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.ok(mascot.size > 100_000 && mascot.size < 500_000);
  assert.ok(mark.size > 10_000);
});
