import { routerText, routerJSON, routerStream } from "./ai-router.ts";
import type { RouterMessage, RouterOpts } from "./ai-router.ts";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntitlementRow {
  trial_expires_at: string | null;
  subscription_expires_at: string | null;
}
interface ProfileRow { is_admin: boolean | null }
interface AiAccessClient {
  from: (table: "profiles" | "exam_program_entitlements") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: ProfileRow | EntitlementRow | null; error?: unknown }>;
      };
    };
  };
  rpc: (
    fn: "check_ai_rate_limit",
    args: { p_user_id: string; p_limit: number },
  ) => PromiseLike<{ data: boolean | null; error?: unknown }>;
}

export async function aiChatText(_env: unknown, systemPrompt: string, messages: RouterMessage[], opts?: RouterOpts): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}
export async function aiChatJSON(_env: unknown, systemPrompt: string, messages: RouterMessage[], opts?: RouterOpts): Promise<unknown> {
  return routerJSON(systemPrompt, messages, opts);
}
export async function aiChatStream(
  _env: unknown, systemPrompt: string, messages: RouterMessage[], opts?: RouterOpts, strict = false,
): Promise<ReadableStream<Uint8Array>> {
  return routerStream(systemPrompt, messages, opts, undefined, strict);
}

/** AI use is charged to the same programme subscription as its study workspace. */
export async function guardAiAccess(
  supabaseClient: unknown,
  user: { id: string },
  examProgramId: "jupeb" | "jamb",
): Promise<Response | null> {
  const supabase = supabaseClient as AiAccessClient;
  const [profileResult, entitlementResult] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle(),
    supabase.from("exam_program_entitlements")
      .select("trial_expires_at,subscription_expires_at")
      .eq("user_id", user.id)
      .eq("exam_program_id", examProgramId)
      .maybeSingle(),
  ]);

  if (profileResult.error || entitlementResult.error || !profileResult.data) {
    return new Response(
      JSON.stringify({ error: "Your programme access could not be verified. Please retry." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const profile = profileResult.data as ProfileRow;
  const entitlement = entitlementResult.data as EntitlementRow | null;
  const now = Date.now();
  const active = (value: string | null | undefined) => {
    if (!value) return false;
    const expiry = Date.parse(value);
    return Number.isFinite(expiry) && expiry > now;
  };
  const isAdmin = profile.is_admin === true;
  const hasProgrammeAccess = isAdmin ||
    active(entitlement?.trial_expires_at) ||
    active(entitlement?.subscription_expires_at);

  if (!hasProgrammeAccess) {
    return new Response(
      JSON.stringify({ error: `Your ${examProgramId.toUpperCase()} trial or subscription has ended. Activate this programme to continue using AI features.` }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (!isAdmin) {
    const { data: allowed, error } = await supabase.rpc("check_ai_rate_limit", {
      p_user_id: user.id,
      p_limit: 100,
    });
    if (error) {
      return new Response(
        JSON.stringify({ error: "Your AI usage limit could not be checked. Please retry." }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Daily AI limit reached (100 requests). Try again tomorrow." }),
        { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }
  return null;
}

export { CORS_HEADERS };
