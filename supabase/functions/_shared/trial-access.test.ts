import { isProgrammeEntitlementActive } from "./trial-access.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const NOW = Date.parse("2026-11-21T12:00:00.000Z");

Deno.test("a JAMB trial entitlement grants access before its expiry", () => {
  assert(isProgrammeEntitlementActive({
    trial_expires_at: "2026-11-22T12:00:00.000Z",
    subscription_expires_at: null,
  }, NOW), "An unexpired JAMB trial should grant programme access.");
});

Deno.test("a JAMB entitlement is independent from JUPEB profile activation", () => {
  assert(!isProgrammeEntitlementActive({
    is_admin: false,
    trial_expires_at: null,
    subscription_expires_at: null,
  }, NOW), "A global legacy activation flag must not grant access without a programme entitlement.");
});

Deno.test("expired trials and subscriptions do not grant access", () => {
  assert(!isProgrammeEntitlementActive({
    trial_expires_at: "2026-11-21T11:59:59.999Z",
    subscription_expires_at: "2026-11-21T11:59:59.999Z",
  }, NOW), "Expired programme dates must fail closed.");
});

Deno.test("an administrator can access either programme without a paid entitlement", () => {
  assert(isProgrammeEntitlementActive({
    is_admin: true,
    trial_expires_at: null,
    subscription_expires_at: null,
  }, NOW), "Verified administrators should bypass programme subscription checks.");
});

Deno.test("invalid or missing expiry values do not grant access", () => {
  assert(!isProgrammeEntitlementActive({
    is_admin: false,
    trial_expires_at: "not-a-date",
    subscription_expires_at: null,
  }, NOW), "Malformed expiry dates must fail closed.");
});
