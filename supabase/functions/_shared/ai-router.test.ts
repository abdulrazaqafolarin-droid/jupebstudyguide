// Regression tests for the transient-retry election logic.
// Run: deno test supabase/functions/_shared/ai-router.test.ts
// The 2026-10-30 outage: free-tier Gemini returned 503 "high demand" spikes
// and >12s header latency; the router tried each key exactly once, so every
// spike became a full outage. These tests pin the retry contract.
import {
  classifyError,
  transientRetryDelayMs,
  TRANSIENT_RETRY_DELAYS_MS,
  type KeyAttemptFailure,
} from "./ai-router.ts";

function assertEquals(actual: unknown, expected: unknown, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function failure(kind: KeyAttemptFailure["kind"], status = 503): KeyAttemptFailure {
  return { label: "test", kind, status, detail: `${status}: test` };
}

Deno.test("transient failure retries once with the first delay", () => {
  const delay = transientRetryDelayMs(failure("transient"), 0, Date.now() + 60_000);
  assertEquals(delay, TRANSIENT_RETRY_DELAYS_MS[0], "first transient retry delay");
});

Deno.test("transient failure does not retry beyond the delay list", () => {
  const delay = transientRetryDelayMs(failure("transient"), 1, Date.now() + 60_000);
  assertEquals(delay, null, "second attempt must not retry");
});

Deno.test("quota failures never retry (escalating vault cooldown handles them)", () => {
  const delay = transientRetryDelayMs(failure("quota", 429), 0, Date.now() + 60_000);
  assertEquals(delay, null, "quota must not retry");
});

Deno.test("fatal failures never retry (auth/config needs a human)", () => {
  const delay = transientRetryDelayMs(failure("fatal", 401), 0, Date.now() + 60_000);
  assertEquals(delay, null, "fatal must not retry");
});

Deno.test("retry is skipped when it would overshoot the election deadline", () => {
  const delay = transientRetryDelayMs(failure("transient"), 0, Date.now() + TRANSIENT_RETRY_DELAYS_MS[0] - 5);
  assertEquals(delay, null, "deadline-clamped retry");
});

Deno.test("classifyError: Google 503 UNAVAILABLE is transient", () => {
  const body = `{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}`;
  assertEquals(classifyError(503, body), "transient", "503 classification");
});

Deno.test("classifyError: 429 quota text is quota even on odd statuses", () => {
  const body = `{"error":{"code":429,"message":"You exceeded your current quota"}}`;
  assertEquals(classifyError(429, body), "quota", "429 classification");
});
