import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppMediaTelemetry,
} from "../src/modules/whatsapp/whatsapp-media.telemetry.js";


test(
  "media telemetry exposes aggregate counters without message dimensions",
  () => {
    const telemetry = new WhatsAppMediaTelemetry();
    telemetry.record("incoming_media");
    telemetry.record("ignored_no_intent");
    telemetry.record("ignored_no_intent");
    const snapshot = telemetry.snapshot();

    assert.deepEqual(snapshot, {
      incoming_media:1,
      ignored_no_intent:2,
      classification_request:0,
      classified_receipt:0,
      classified_non_receipt:0,
      scan_success:0,
      scan_fallback:0,
      pdf_generated:0,
    });
    assert.deepEqual(Object.keys(snapshot).sort(), [
      "classification_request",
      "classified_non_receipt",
      "classified_receipt",
      "ignored_no_intent",
      "incoming_media",
      "pdf_generated",
      "scan_fallback",
      "scan_success",
    ]);
  },
);
