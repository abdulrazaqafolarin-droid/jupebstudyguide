// Checks the caller's exact Supabase session against auth.sessions.
// Returns true when active, false when revoked, and null when verification fails.
export async function checkAuthSessionActive(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
): Promise<boolean | null> {
  if (!supabaseUrl || !anonKey || !accessToken) return null;

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/current_auth_session_is_active`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: "{}",
      },
    );
    if (!response.ok) return null;
    const result: unknown = await response.json();
    return result === true;
  } catch {
    return null;
  }
}
