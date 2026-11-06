import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function isValidToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

async function tokenDigest(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);

  try {
    const payload = await req.json().catch(() => null) as {
      token?: unknown;
      action?: unknown;
      content?: unknown;
    } | null;

    if (!payload || !isValidToken(payload.token)) {
      return json({ error: "invalid-action-token" }, 400);
    }
    if (payload.action !== "reply" && payload.action !== "read") {
      return json({ error: "invalid-action" }, 400);
    }

    let content: string | null = null;
    if (payload.action === "reply") {
      if (typeof payload.content !== "string") {
        return json({ error: "message-required" }, 400);
      }
      content = payload.content.trim();
      if (!content || content.length > 2000) {
        return json({ error: "message-length-invalid" }, 400);
      }
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[notification-action] server configuration missing");
      return json({ error: "temporarily-unavailable" }, 503);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("consume_notification_action", {
      p_token_hash: await tokenDigest(payload.token),
      p_action: payload.action,
      p_content: content,
    });

    if (error) {
      console.error("[notification-action] action redemption failed:", error.message);
      return json({ error: "action-failed" }, 500);
    }

    if (!data?.ok) {
      return json({ error: "action-expired-or-already-used" }, 410);
    }
    return json({ ok: true, action: payload.action });
  } catch (error) {
    console.error("[notification-action] unexpected failure:", error);
    return json({ error: "internal-error" }, 500);
  }
});
