export interface ApnsConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  environment: "sandbox" | "production";
}

function pemToBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Create the ES256 provider JWT used by APNs. Tokens should be reused for up to 50 minutes. */
export async function createApnsProviderToken(
  config: ApnsConfig,
  nowMs = Date.now(),
  cryptoApi: Crypto = crypto,
): Promise<string> {
  if (!/^[A-Z0-9]{10}$/.test(config.keyId) || !/^[A-Z0-9]{10}$/.test(config.teamId)) {
    throw new Error("APNs key ID or team ID has an invalid format");
  }
  const issuedAt = Math.floor(nowMs / 1000);
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid: config.keyId })),
  );
  const claims = base64url(
    new TextEncoder().encode(JSON.stringify({ iss: config.teamId, iat: issuedAt })),
  );
  const unsigned = `${header}.${claims}`;
  const key = await cryptoApi.subtle.importKey(
    "pkcs8",
    pemToBytes(config.privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await cryptoApi.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64url(signature)}`;
}

export interface ApnsSendResult {
  ok: boolean;
  status: number;
  reason?: string;
}

/** Send an alert over Deno fetch (which negotiates HTTP/2 through TLS for APNs). */
export async function sendApnsAlert(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
  config: ApnsConfig,
  providerToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApnsSendResult> {
  if (!/^[a-f0-9]{32,200}$/i.test(deviceToken)) {
    throw new Error("APNs device token has an invalid hexadecimal format");
  }
  if (!/^[A-Za-z0-9.-]+$/.test(config.bundleId)) {
    throw new Error("APNs bundle ID has an invalid format");
  }
  const host = config.environment === "sandbox"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";
  const response = await fetchImpl(`https://${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${providerToken}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 86400),
    },
    body: JSON.stringify({
      aps: { alert: { title, body }, sound: "default" },
      ...data,
    }),
  });
  if (response.ok) return { ok: true, status: response.status };
  const payload = await response.json().catch(() => ({})) as { reason?: string };
  return { ok: false, status: response.status, reason: payload.reason };
}
