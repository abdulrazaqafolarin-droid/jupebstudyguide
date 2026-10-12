import { routerText, routerJSON, routerStream } from "./ai-router.ts";
import type { RouterMessage, RouterOpts } from "./ai-router.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function aiChatText(
  _env: unknown,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: RouterOpts
): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}

export async function aiChatJSON(
  _env: unknown,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: RouterOpts
): Promise<unknown> {
  return routerJSON(systemPrompt, messages, opts);
}

export async function aiChatStream(
  _env: unknown,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: RouterOpts
): Promise<ReadableStream<Uint8Array>> {
  return routerStream(systemPrompt, messages, opts);
}

// Per-user AI abuse guard: requires an activated (or admin) account and
// enforces a daily request cap. Returns an error Response when blocked,
// or null when the request may proceed.
export async function guardAiAccess(
  supabase: ReturnType<typeof createClient>,
  user: { id: string }
): Promise<Response | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_activated, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.is_activated && !profile?.is_admin) {
    return new Response(
      JSON.stringify({ error: "Account activation required to use AI features" }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
  if (!profile?.is_admin) {
    const { data: allowed } = await supabase.rpc("check_ai_rate_limit", {
      p_user_id: user.id,
      p_limit: 100,
    });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Daily AI limit reached (100 requests). Try again tomorrow." }),
        { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  }
  return null;
}

export { CORS_HEADERS };
