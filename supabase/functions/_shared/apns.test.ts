import {
  createApnsProviderToken,
  sendApnsAlert,
  type ApnsConfig,
} from "./apns.ts";

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToPem(bytes: ArrayBuffer): string {
  const data = new Uint8Array(bytes);
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  const base64 = btoa(binary).match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
}

async function createTestConfig(): Promise<{ config: ApnsConfig; publicKey: CryptoKey }> {
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privateBytes = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
  return {
    config: {
      keyId: "ABC123DE45",
      teamId: "TEAM123456",
      bundleId: "com.jupeb.master",
      privateKey: bytesToPem(privateBytes),
      environment: "sandbox",
    },
    publicKey: keys.publicKey,
  };
}

Deno.test("APNs provider JWT contains the required claims and a valid ES256 signature", async () => {
  const { config, publicKey } = await createTestConfig();
  const fixedNow = Date.UTC(2026, 10, 7, 12, 0, 0);
  const token = await createApnsProviderToken(config, fixedNow);
  const [encodedHeader, encodedClaims, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedClaims || !encodedSignature) {
    throw new Error("Provider token is not a three-part JWT");
  }

  const decodeJson = (part: string) =>
    JSON.parse(new TextDecoder().decode(base64UrlToBytes(part))) as Record<string, unknown>;
  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedClaims);

  if (header.alg !== "ES256" || header.kid !== config.keyId) {
    throw new Error("APNs JWT header is incorrect");
  }
  if (claims.iss !== config.teamId || claims.iat !== Math.floor(fixedNow / 1000)) {
    throw new Error("APNs JWT claims are incorrect");
  }
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`),
  );
  if (!valid) throw new Error("APNs JWT signature did not verify");
});

Deno.test("APNs alert uses the sandbox endpoint, app topic and correct alert payload", async () => {
  const { config } = await createTestConfig();
  let requestedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fakeFetch: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    capturedInit = init;
    return new Response(null, { status: 200 });
  };

  const result = await sendApnsAlert(
    "a".repeat(64),
    "A new message",
    "Please check your study group.",
    { type: "chat", conversation_id: "conversation-123" },
    config,
    "test-provider-token",
    fakeFetch,
  );

  if (!result.ok || result.status !== 200) throw new Error("Expected successful APNs response");
  if (requestedUrl !== `https://api.sandbox.push.apple.com/3/device/${"a".repeat(64)}`) {
    throw new Error("APNs sandbox endpoint was not selected");
  }
  const headers = new Headers(capturedInit?.headers);
  if (headers.get("apns-topic") !== config.bundleId) throw new Error("Wrong APNs topic");
  if (headers.get("apns-push-type") !== "alert") throw new Error("Wrong APNs push type");
  if (headers.get("authorization") !== "bearer test-provider-token") {
    throw new Error("Provider token was not attached");
  }
  const payload = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
  const aps = payload.aps as { alert?: { title?: string; body?: string }; sound?: string };
  if (aps.alert?.title !== "A new message" || aps.alert.body !== "Please check your study group.") {
    throw new Error("APNs alert content is incorrect");
  }
  if (payload.conversation_id !== "conversation-123") throw new Error("Deep-link data is missing");
});

Deno.test("APNs delivery reports the provider rejection reason without throwing", async () => {
  const { config } = await createTestConfig();
  const result = await sendApnsAlert(
    "b".repeat(64),
    "Title",
    "Body",
    {},
    config,
    "test-token",
    async () => new Response(JSON.stringify({ reason: "Unregistered" }), {
      status: 410,
      headers: { "content-type": "application/json" },
    }),
  );
  if (result.ok || result.status !== 410 || result.reason !== "Unregistered") {
    throw new Error("APNs provider rejection was not parsed");
  }
});

Deno.test("APNs rejects malformed device tokens before making a network request", async () => {
  const { config } = await createTestConfig();
  let called = false;
  const fakeFetch: typeof fetch = async () => {
    called = true;
    return new Response(null, { status: 200 });
  };
  let rejected = false;
  try {
    await sendApnsAlert("not-a-device-token", "Title", "Body", {}, config, "token", fakeFetch);
  } catch {
    rejected = true;
  }
  if (!rejected || called) throw new Error("Malformed APNs token was not rejected safely");
});

Deno.test("APNs rejects malformed key identifiers", async () => {
  const { config } = await createTestConfig();
  let rejected = false;
  try {
    await createApnsProviderToken({ ...config, keyId: "not-valid" });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Malformed APNs key identifier was accepted");
});
