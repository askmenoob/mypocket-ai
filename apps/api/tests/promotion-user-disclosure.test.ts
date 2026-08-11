import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("billing modal promotion preview discloses charges without redeeming or creating checkout", () => {
  const component = readFileSync(
    new URL("../../web/src/promo-quote-disclosure.tsx", import.meta.url),
    "utf8",
  );
  const bootstrap = readFileSync(
    new URL("../../web/src/app-bootstrap.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../../web/src/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(component, /\/promotion\/quote/u);
  assert.match(component, /First charge/u);
  assert.match(component, /Trial expiry/u);
  assert.match(component, /Next charge/u);
  assert.match(component, /Cancel before/u);
  assert.match(component, /no payment, redemption or checkout is created/iu);
  assert.doesNotMatch(component, /\/promotion\/redeem/u);
  assert.doesNotMatch(component, /\/billing\/hitpay\/checkout/u);
  assert.match(bootstrap, /<PromoQuoteDisclosure/u);
  assert.match(
    styles,
    /\.promo-admin-shell\{[^}]*color:#19302d/u,
  );
  assert.match(
    styles,
    /\.promo-quote-result\{[^}]*color:#19302d/u,
  );
});
