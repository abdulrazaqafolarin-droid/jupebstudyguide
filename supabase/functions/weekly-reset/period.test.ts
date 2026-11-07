import { getPreviousCompletedWeek } from "./period.ts";

function expectEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

Deno.test("Monday 01:00 UTC cron closes the preceding Monday-Sunday week", () => {
  const period = getPreviousCompletedWeek(new Date("2026-11-02T01:00:00.000Z"));
  expectEqual(period.startDate, "2026-10-26", "week start");
  expectEqual(period.endDate, "2026-11-01", "week end");
  expectEqual(period.startIso, "2026-10-26T00:00:00.000Z", "inclusive lower bound");
  expectEqual(period.endExclusiveIso, "2026-11-02T00:00:00.000Z", "exclusive upper bound");
});

Deno.test("a request during the week still selects the previous completed week", () => {
  const period = getPreviousCompletedWeek(new Date("2026-11-07T23:59:59.999Z"));
  expectEqual(period.startDate, "2026-10-26", "week start");
  expectEqual(period.endDate, "2026-11-01", "week end");
});

Deno.test("a new Monday moves the completed period forward by seven days", () => {
  const period = getPreviousCompletedWeek(new Date("2026-11-09T01:00:00.000Z"));
  expectEqual(period.startDate, "2026-11-02", "week start");
  expectEqual(period.endDate, "2026-11-08", "week end");
});

Deno.test("UTC calculation is unaffected by a non-UTC local offset in input text", () => {
  const period = getPreviousCompletedWeek(new Date("2026-11-02T05:00:00.000+05:00"));
  expectEqual(period.startDate, "2026-10-26", "week start");
  expectEqual(period.endExclusiveIso, "2026-11-02T00:00:00.000Z", "exclusive upper bound");
});
