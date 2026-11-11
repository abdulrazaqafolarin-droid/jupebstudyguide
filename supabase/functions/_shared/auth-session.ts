import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Confirm that the JWT's session_id still exists in auth.sessions.
 * Revoked JWTs can remain cryptographically valid until exp, so getUser()
 * alone is not enough for single-device enforcement.
 *
 * Returns true/false for a verified result and null when the check is
 * temporarily unavailable. Callers must fail closed on both false and null.
 */
export async function checkAuthSessionActive(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
): Promise<boolean | null> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await client.rpc("current_auth_session_is_active");
  if (error) {
    console.error("[session-guard] session lookup failed:", error.message);
    return null;
  }
  return data === true;
}
