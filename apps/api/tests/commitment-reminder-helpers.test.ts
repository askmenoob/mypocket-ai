import assert from "node:assert/strict";
import test from "node:test";

import { CommitmentScheduler } from "../src/modules/commitment/commitment.scheduler.js";
import { CommitmentService } from "../src/modules/commitment/commitment.service.js";

const fakeApp = {
  log:{
    error(){},
  },
} as any;

test("commitment due date uses the last day when dueDay exceeds month length", () => {
  const service =
    new CommitmentService(
      fakeApp,
    ) as any;

  const leapYearDate =
    service.dueDateForPeriod(
      2028,
      2,
      31,
    ) as Date;

  assert.equal(
    leapYearDate.getFullYear(),
    2028,
  );
  assert.equal(
    leapYearDate.getMonth(),
    1,
  );
  assert.equal(
    leapYearDate.getDate(),
    29,
  );

  const nonLeapYearDate =
    service.dueDateForPeriod(
      2027,
      2,
      31,
    ) as Date;

  assert.equal(
    nonLeapYearDate.getFullYear(),
    2027,
  );
  assert.equal(
    nonLeapYearDate.getMonth(),
    1,
  );
  assert.equal(
    nonLeapYearDate.getDate(),
    28,
  );
});

test("reminder time is calculated days before due date at the configured time", () => {
  const scheduler =
    new CommitmentScheduler(
      fakeApp,
    ) as any;

  const reminderAt =
    scheduler.reminderAt(
      new Date(2026, 7, 10, 0, 0, 0, 0),
      2,
      "09:30",
    ) as Date;

  assert.equal(
    reminderAt.getFullYear(),
    2026,
  );
  assert.equal(
    reminderAt.getMonth(),
    7,
  );
  assert.equal(
    reminderAt.getDate(),
    8,
  );
  assert.equal(
    reminderAt.getHours(),
    9,
  );
  assert.equal(
    reminderAt.getMinutes(),
    30,
  );
});

test("quiet hours move late-night reminders to the quiet-hours end time", () => {
  const scheduler =
    new CommitmentScheduler(
      fakeApp,
    ) as any;

  const scheduledFor =
    scheduler.applyQuietHours(
      new Date(2026, 7, 8, 23, 15, 0, 0),
      "22:00",
      "08:00",
    ) as Date;

  assert.equal(
    scheduledFor.getDate(),
    9,
  );
  assert.equal(
    scheduledFor.getHours(),
    8,
  );
  assert.equal(
    scheduledFor.getMinutes(),
    0,
  );
});

test("quiet hours move early-morning reminders to the same-day quiet-hours end time", () => {
  const scheduler =
    new CommitmentScheduler(
      fakeApp,
    ) as any;

  const scheduledFor =
    scheduler.applyQuietHours(
      new Date(2026, 7, 8, 7, 45, 0, 0),
      "22:00",
      "08:00",
    ) as Date;

  assert.equal(
    scheduledFor.getDate(),
    8,
  );
  assert.equal(
    scheduledFor.getHours(),
    8,
  );
  assert.equal(
    scheduledFor.getMinutes(),
    0,
  );
});
