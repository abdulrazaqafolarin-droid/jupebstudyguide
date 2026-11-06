import { routerText, routerJSON, routerStream } from "./ai-router.ts";
import type { RouterMessage, RouterOpts } from "./ai-router.ts";
import { hasAiAccountAccess } from "./trial-access.ts";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AiAccessClient {
  from: (table: "profiles") => {
    select: (columns: string) => {
      eq: (column: "user_id", value: string) => {
        maybeSingle: () => Promise<{
          data: import("./trial-access.ts").AiAccessProfile | null;
        }>;
      };
    };
  };
  rpc: (
    fn: "check_ai_rate_limit",
    args: { p_user_id: string; p_limit: number },
  ) => Promise<{ data: boolean | null }>;
}

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
  opts?: RouterOpts,
  strict = false
): Promise<ReadableStream<Uint8Array>> {
  return routerStream(systemPrompt, messages, opts, undefined, strict);
}

// Per-user AI access guard: requires an activated, admin, or currently
// trial-eligible account and enforces the same daily request cap for all
// non-admin users. Trial expiry is read from the server-owned profile column.
export async function guardAiAccess(
  supabase: AiAccessClient,
  user: { id: string }
): Promise<Response | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_activated, is_admin, trial_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!hasAiAccountAccess(profile)) {
    return new Response(
      JSON.stringify({ error: "Your one-day free trial has ended. Enter an activation code to continue using AI features." }),
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
