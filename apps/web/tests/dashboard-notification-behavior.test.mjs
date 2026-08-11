import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(
  new URL("../src/app-bootstrap.tsx", import.meta.url),
  "utf8",
);

test("notification panel closes shortly after the pointer leaves", () => {
  assert.match(
    appSource,
    /const notificationCloseTimerRef =\s*useRef<number \| null>\(null\)/,
  );
  assert.match(
    appSource,
    /function scheduleNotificationClose\(\)[\s\S]*?window\.setTimeout\([\s\S]*?setNotificationOpen\(false\)[\s\S]*?180/,
  );
  assert.match(
    appSource,
    /className="notificationPanel"[\s\S]*?onMouseEnter=\{cancelNotificationClose\}[\s\S]*?onMouseLeave=\{scheduleNotificationClose\}/,
  );
  assert.match(
    appSource,
    /useEffect\(\(\) => \(\) => \{[\s\S]*?cancelNotificationClose\(\)[\s\S]*?\}, \[\]\)/,
  );
});
