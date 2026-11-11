import { routerText, routerJSON, routerStream } from "./ai-router.ts";
import type { RouterMessage, RouterOpts } from "./ai-router.ts";
import { hasAiAccountAccess } from "./trial-access.ts";
import { checkAuthSessionActive } from "./auth-session.ts";
import type { AiAccessProfile } from "./trial-access.ts";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const OWNER_EMAIL = "abdulrazaqafolarin@gmail.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AiAccessClient {
  from: (table: "profiles") => {
    select: (columns: string) => {
      eq: (column: "user_id", value: string) => {
        maybeSingle: () => PromiseLike<{
          data: AiAccessProfile | null;
        }>;
      };
    };
  };
  rpc: (
    fn: "check_ai_rate_limit",
    args: { p_user_id: string; p_limit: number },
  ) => PromiseLike<{ data: boolean | null }>;
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

// Per-user AI access guard: first verifies the exact caller session, then
// requires either the owner administrator account or an unexpired paid
// subscription. The daily request cap applies to all non-admin users.
export async function guardAiAccess(
  supabaseClient: unknown,
  user: { id: string; email?: string | null },
  accessToken: string,
): Promise<Response | null> {
  const sessionActive = await checkAuthSessionActive(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    accessToken,
  );
  if (sessionActive !== true) {
    return new Response(
      JSON.stringify({ error: sessionActive === false ? "This device session is no longer active. Please sign in again." : "Could not verify this device session. Please retry." }),
      { status: sessionActive === false ? 401 : 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Narrow the SDK's deeply generic client at this shared boundary only.
  const supabase = supabaseClient as AiAccessClient;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, subscription_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const isOwnerAdmin =
    user.email?.trim().toLowerCase() === OWNER_EMAIL &&
    profile?.is_admin === true;
  const accessProfile: AiAccessProfile | null = profile
    ? { is_admin: isOwnerAdmin, subscription_expires_at: profile.subscription_expires_at }
    : null;

  if (!hasAiAccountAccess(accessProfile)) {
    return new Response(
      JSON.stringify({ error: "Your subscription is inactive or has expired. Enter a current activation code to continue using AI features." }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
  if (!isOwnerAdmin) {
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
