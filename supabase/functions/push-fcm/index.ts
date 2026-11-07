import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { createApnsProviderToken, sendApnsAlert, type ApnsConfig } from "../_shared/apns.ts";

// push-fcm — closed-app message push (FCM HTTP v1 + APNs + Web Push).
// Invoked by the dispatch_push_notification trigger on messages INSERT via
// pg_net. Unlike the old LocalNotifications path, FCM wakes an app that
// Android has fully killed — this is the WhatsApp-style closed-app pop.
// Web Push subscriptions (browser/PWA students) receive the same pop, so
// delivery is consistent across every app and account.
//
// The body carries ONLY the message id; everything else (recipients, mute
// state, preview) is re-read with the service role, so a forged request can
// at worst re-notify about a real, <5 minutes old message. iOS device tokens
// are sent directly to APNs; Android tokens continue to use FCM.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const STALE_MS = 5 * 60_000;
const PUSH_CHANNEL = "messages";

// In-memory abuse guards (per warm isolate, best-effort): one dispatch per
// message id per minute plus a global send budget, so forged public calls
// cannot re-pop a conversation in a loop or burn FCM quota.
const recentDispatches = new Map<string, number>();
let dispatchWindowStartMs = 0;
let dispatchesInWindow = 0;
const DISPATCH_DEDUP_MS = 60_000;
const MAX_DISPATCHES_PER_WINDOW = 120;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") || "com.jupeb.master";
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") || "";
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") || "";
const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY") || "";
const APNS_ENVIRONMENT = (Deno.env.get("APNS_ENVIRONMENT") || "production").toLowerCase();

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
let cachedApnsToken: { token: string; expiresAtMs: number } | null = null;

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


function loadApnsConfig(): ApnsConfig | null {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_AUTH_KEY) return null;
  if (!/^[A-Z0-9]{10}$/.test(APNS_KEY_ID) || !/^[A-Z0-9]{10}$/.test(APNS_TEAM_ID)) {
    throw new Error("APNs key ID or team ID has an invalid format");
  }
  if (!/^[A-Za-z0-9.-]+$/.test(APNS_BUNDLE_ID)) {
    throw new Error("APNs bundle ID has an invalid format");
  }
  return {
    keyId: APNS_KEY_ID,
    teamId: APNS_TEAM_ID,
    bundleId: APNS_BUNDLE_ID,
    privateKey: APNS_AUTH_KEY.replace(/\\n/g, "\n"),
    environment: APNS_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
  };
}

/** Reuse an APNs provider token within its 50-minute cache window. */
async function getApnsProviderToken(config: ApnsConfig): Promise<string> {
  const nowMs = Date.now();
  if (cachedApnsToken && cachedApnsToken.expiresAtMs > nowMs + 60_000) {
    return cachedApnsToken.token;
  }
  const token = await createApnsProviderToken(config, nowMs);
  cachedApnsToken = { token, expiresAtMs: nowMs + 50 * 60_000 };
  return token;
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

const createActionToken = async (recipientId: string, conversationId: string, messageId: string, action: "reply" | "read"): Promise<string | null> => {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const { error } = await admin.from("notification_action_tokens").insert({
    token_hash: hash, recipient_id: recipientId, conversation_id: conversationId,
    source_message_id: messageId, action,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) {
    console.warn("[push-fcm] Could not create notification action token:", error.message);
    return null;
  }
  return token;
};

    // Keep one-time action tokens bounded. Expired credentials can never be
    // redeemed, and this cleanup runs only when a new push dispatch occurs.
    const { error: cleanupError } = await admin
      .from("notification_action_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (cleanupError) console.warn("[push-fcm] action-token cleanup failed:", cleanupError.message);

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

    // Fan out to BOTH delivery wires for the same recipients: FCM device
    // tokens (the Android APK) and Web Push subscriptions (the browser/PWA).
    // Previously only device_tokens were consulted, so a web-only student
    // never got a closed-app push — the "notifications aren't consistent
    // across apps/accounts" bug.
    const [tokenRowsRes, webSubsRes] = await Promise.all([
      admin.from("device_tokens").select("user_id, token, platform, supports_notification_actions").in("user_id", targets),
      admin
        .from("notification_subscriptions")
        .select("user_id, endpoint, p256dh, auth")
        .in("user_id", targets),
    ]);
    const tokenRows = tokenRowsRes.data || [];
    const webSubs = webSubsRes.data || [];
    if (tokenRows.length === 0 && webSubs.length === 0) {
      return json({ skipped: "no-targets" });
    }

    const { data: senderProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", message.sender_id)
      .maybeSingle();
    const title = (senderProfile?.display_name as string | null) || "New message";
    const body = buildPreview(message as MessageRow);

    const nowMs = Date.now();
    for (const [id, ts] of recentDispatches) {
      if (nowMs - ts > 5 * 60_000) recentDispatches.delete(id);
    }
    if (recentDispatches.has(messageId)) return json({ skipped: "recently-dispatched" });
    if (nowMs - dispatchWindowStartMs > 60_000) {
      dispatchWindowStartMs = nowMs;
      dispatchesInWindow = 0;
    }
    if (dispatchesInWindow >= MAX_DISPATCHES_PER_WINDOW) return json({ skipped: "rate-limited" });
    recentDispatches.set(messageId, nowMs);
    dispatchesInWindow++;

    const androidRows = tokenRows.filter((row) => row.platform !== "ios");
    const iosRows = tokenRows.filter((row) => row.platform === "ios");
    const deadTokens: string[] = [];
    const failures: { platform: string; status: number; error: string }[] = [];
    let sent = 0;
    let iosSent = 0;
    let iosSkipped = 0;
    let webSent = 0;

    // --- Wire 1a: FCM to Android devices -------------------------------
    if (androidRows.length > 0) {
      const serviceAccount = loadServiceAccount();
      const accessToken = await getAccessToken(serviceAccount);
      const endpoint =
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

      // Inline reply/read is implemented only by the Android notification receiver.
      const actionTokens = new Map<string, { reply: string | null; read: string | null }>();
      const actionCapableRows = androidRows.filter((row) => row.supports_notification_actions === true);
      await Promise.all(actionCapableRows.map(async (row) => {
        const [reply, read] = await Promise.all([
          createActionToken(String(row.user_id), String(message.conversation_id), String(message.id), "reply"),
          createActionToken(String(row.user_id), String(message.conversation_id), String(message.id), "read"),
        ]);
        actionTokens.set(String(row.token), { reply, read });
      }));

      await Promise.all(
        androidRows.map(async (row) => {
          const actions = actionTokens.get(String(row.token));
          const supportsActions = row.supports_notification_actions === true && Boolean(actions?.reply && actions?.read);
          const notificationMessage = supportsActions
            ? {
                token: row.token,
                data: {
                  type: "chat",
                  title,
                  body,
                  channel_id: PUSH_CHANNEL,
                  conversation_id: String(message.conversation_id),
                  message_id: String(message.id),
                  reply_token: actions!.reply!,
                  read_token: actions!.read!,
                },
                android: { priority: "HIGH", ttl: "86400s" },
              }
            : {
                token: row.token,
                notification: { title, body },
                data: {
                  type: "chat",
                  conversation_id: String(message.conversation_id),
                  message_id: String(message.id),
                },
                android: { priority: "HIGH", ttl: "86400s" },
              };
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ message: notificationMessage }),
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
          failures.push({
            platform: "android",
            status: res.status,
            error: errText.split(row.token).join("***").slice(0, 300),
          });
          console.warn(`[push-fcm] Android send failed (${res.status}): ${errText}`);
        }),
      );
    }

    // --- Wire 1b: APNs to iOS devices ---------------------------------
    // APNs credentials are separate from Firebase credentials. Without
    // them, Android and web delivery continue normally and iOS users still
    // receive in-app Realtime + locally scheduled reminders while online.
    if (iosRows.length > 0) {
      try {
        const apnsConfig = loadApnsConfig();
        if (!apnsConfig) {
          iosSkipped = iosRows.length;
          console.warn("[push-fcm] APNs secrets are not configured; skipping iOS remote pushes");
        } else {
          const providerToken = await getApnsProviderToken(apnsConfig);
          await Promise.all(
            iosRows.map(async (row) => {
            try {
              const result = await sendApnsAlert(
                String(row.token),
                title,
                body,
                {
                  type: "chat",
                  conversation_id: String(message.conversation_id),
                  message_id: String(message.id),
                },
                apnsConfig,
                providerToken,
              );
              if (result.ok) {
                iosSent++;
                return;
              }
              // Only APNs Unregistered is a definitive stale token. BadDeviceToken
              // can also mean the configured sandbox/production endpoint is wrong.
              if (result.status === 410 && result.reason === "Unregistered") {
                deadTokens.push(String(row.token));
              }
              failures.push({
                platform: "ios",
                status: result.status,
                error: (result.reason || "APNs delivery failed").slice(0, 200),
              });
              console.warn(`[push-fcm] iOS APNs send failed (${result.status}): ${result.reason || "unknown"}`);
            } catch (error) {
              failures.push({
                platform: "ios",
                status: 0,
                error: "APNs request failed",
              });
              console.warn("[push-fcm] iOS APNs request failed:", error);
            }
            }),
          );
        }
      } catch (error) {
        // APNs is an independent delivery wire. A missing or invalid Apple key
        // must never prevent Android FCM or browser Web Push for this message.
        iosSkipped = iosRows.length - iosSent;
        console.error("[push-fcm] APNs delivery is unavailable; other push transports will continue:", error);
      }
    }

    if (deadTokens.length > 0) {
      await admin.from("device_tokens").delete().in("token", [...new Set(deadTokens)]);
    }

    // --- Wire 2: Web Push to browser/PWA subscriptions ---------------
    // Same title/body and the same dead-subscription cleanup send-push used,
    // but invoked from the message INSERT trigger (service role), which the
    // client-authenticated send-push function can never be.
    if (webSubs.length > 0) {
      const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
      const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
      const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:push@jupebmaster.app";
      if (!vapidPublic || !vapidPrivate) {
        // Same secrets send-push uses; without them web delivery is skipped
        // but the FCM path above is unaffected.
        console.warn("[push-fcm] VAPID keys not set — skipping Web Push fanout");
      } else {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        const deadEndpoints: string[] = [];
        await Promise.all(
          webSubs.map(async (sub) => {
            try {
              const readToken = await createActionToken(
                String(sub.user_id), String(message.conversation_id), String(message.id), "read",
              );
              const webPayload = JSON.stringify({
                title,
                body,
                data: {
                  type: "chat",
                  conversation_id: String(message.conversation_id),
                  message_id: String(message.id),
                  read_token: readToken ?? "",
                  // The service worker's click actions route into the exact thread.
                  url: `/chat?conversation=${encodeURIComponent(String(message.conversation_id))}`,
                },
              });
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                webPayload,
              );
              webSent++;
            } catch (err) {
              const status = (err as { statusCode?: number }).statusCode;
              // 404/410 = the browser revoked this subscription; drop the row
              // so we stop sending into the void.
              if (status === 404 || status === 410) deadEndpoints.push(sub.endpoint);
              else console.warn(`[push-fcm] web push failed (${status}): ${String(err)}`);
            }
          }),
        );
        if (deadEndpoints.length > 0) {
          await admin.from("notification_subscriptions").delete().in("endpoint", deadEndpoints);
        }
      }
    }

    return json({
      ok: true,
      message_id: messageId,
      targets: targets.length,
      sent,
      ios_sent: iosSent,
      ios_skipped: iosSkipped,
      web_sent: webSent,
      dead: deadTokens.length,
      failures: failures.slice(0, 5),
    });
  } catch (err) {
    console.error("[push-fcm] error:", err);
    return json({ error: "internal error" }, 500);
  }
});
