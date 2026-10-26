import { createClient } from "npm:@supabase/supabase-js@2";

// push-fcm — closed-app message push (FCM HTTP v1).
// Invoked by the dispatch_push_notification trigger on messages INSERT via
// pg_net. Unlike the old LocalNotifications path, FCM wakes an app that
// Android has fully killed — this is the WhatsApp-style closed-app pop.
//
// The body carries ONLY the message id; everything else (recipients, mute
// state, preview) is re-read with the service role, so a forged request can
// at worst re-notify about a real, <5 minutes old message.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const STALE_MS = 5 * 60_000;
const PUSH_CHANNEL = "messages";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string | null;
  created_at: string;
}

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FCM_SERVICE_ACCOUNT secret is not set");
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FCM_SERVICE_ACCOUNT is missing required fields");
  }
  return parsed;
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

function b64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// OAuth2 access token for FCM: RS256-signed JWT exchanged at Google's
// token endpoint, cached until shortly before expiry.
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const nowMs = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > nowMs + 60_000) {
    return cachedAccessToken.token;
  }
  const iat = Math.floor(nowMs / 1000);
  const header = b64url(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const claims = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: FCM_SCOPE,
        aud: OAUTH_TOKEN_URL,
        iat,
        exp: iat + 3600,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${b64url(signature)}`;

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}` +
      `&assertion=${encodeURIComponent(assertion)}`,
  });
  if (!res.ok) {
    throw new Error(`OAuth token exchange failed: ${res.status} ${await res.text()}`);
  }
  const payload = (await res.json()) as { access_token: string; expires_in?: number };
  cachedAccessToken = {
    token: payload.access_token,
    expiresAtMs: nowMs + Number(payload.expires_in ?? 3600) * 1000,
  };
  return cachedAccessToken.token;
}

function buildPreview(message: MessageRow): string {
  switch (message.message_type) {
    case "image":
      return "Sent a photo";
    case "audio":
      return "Sent a voice message";
    case "file":
      return "Sent a file";
    default: {
      const text = (message.content || "").trim();
      if (!text) return "Sent a message";
      return text.length > 120 ? `${text.slice(0, 117)}...` : text;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const payload = (await req.json()) as { message_id?: unknown };
    const messageId =
      typeof payload.message_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.message_id,
      )
        ? payload.message_id
        : null;
    if (!messageId) return json({ error: "message_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: message } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content, message_type, created_at")
      .eq("id", messageId)
      .maybeSingle();
    if (!message) return json({ skipped: "no-message" });

    // Freshness guard: a replayed id can never re-pop an old chat.
    const createdAtMs = Date.parse(message.created_at);
    if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > STALE_MS) {
      return json({ skipped: "stale" });
    }

    const { data: participants } = await admin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", message.conversation_id);
    const recipients = (participants || [])
      .map((row) => String(row.user_id))
      .filter((id) => id !== String(message.sender_id));
    if (recipients.length === 0) return json({ skipped: "no-recipients" });

    const { data: mutedRows } = await admin
      .from("muted_conversations")
      .select("user_id")
      .eq("conversation_id", message.conversation_id);
    const muted = new Set((mutedRows || []).map((row) => String(row.user_id)));
    const targets = recipients.filter((id) => !muted.has(id));
    if (targets.length === 0) return json({ skipped: "all-muted" });

    const { data: tokenRows } = await admin
      .from("device_tokens")
      .select("user_id, token")
      .in("user_id", targets);
    if (!tokenRows || tokenRows.length === 0) return json({ skipped: "no-tokens" });

    const { data: senderProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", message.sender_id)
      .maybeSingle();
    const title = (senderProfile?.display_name as string | null) || "New message";
    const body = buildPreview(message as MessageRow);

    const serviceAccount = loadServiceAccount();
    const accessToken = await getAccessToken(serviceAccount);
    const endpoint =
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    const deadTokens: string[] = [];
    const failures: { status: number; error: string }[] = [];
    let sent = 0;

    await Promise.all(
      tokenRows.map(async (row) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: { title, body },
              data: {
                type: "chat",
                conversation_id: String(message.conversation_id),
                message_id: String(message.id),
              },
              android: {
                priority: "HIGH",
                notification: {
                  channel_id: PUSH_CHANNEL,
                  // One shade entry per conversation; newest replaces it.
                  tag: String(message.conversation_id),
                  icon: "ic_stat_rutex",
                  color: "#E19209",
                  sound: "default",
                },
              },
            },
          }),
        });
        if (res.ok) {
          sent++;
          return;
        }
        const errText = await res.text();
        const lower = errText.toLowerCase();
        if (
          res.status === 404 ||
          lower.includes("unregistered") ||
          lower.includes("notregistered") ||
          lower.includes("registration token")
        ) {
          deadTokens.push(row.token);
        }
        // Sanitized excerpt for diagnostics — the token itself never leaks.
        failures.push({
          status: res.status,
          error: errText.split(row.token).join("***").slice(0, 300),
        });
        console.warn(`[push-fcm] send failed (${res.status}): ${errText}`);
      }),
    );

    if (deadTokens.length > 0) {
      await admin.from("device_tokens").delete().in("token", deadTokens);
    }

    return json({
      ok: true,
      message_id: messageId,
      targets: targets.length,
      sent,
      dead: deadTokens.length,
      failures: failures.slice(0, 5),
    });
  } catch (err) {
    console.error("[push-fcm] error:", err);
    return json({ error: "internal error" }, 500);
  }
});
