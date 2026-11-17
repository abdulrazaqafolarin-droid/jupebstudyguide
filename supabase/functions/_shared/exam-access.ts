import { createClient } from "npm:@supabase/supabase-js@2";

interface ProfileAccess {
  is_admin: boolean | null;
  trial_expires_at: string | null;
  subscription_expires_at: string | null;
}

/** Check the same server-owned session and entitlement conditions as the
 * study_questions authenticated SELECT policy. Practice actions are not AI
 * requests and therefore do not consume the separate AI request quota. */
export async function hasActiveStudyAccess(
  supabaseUrl: string,
  serviceRoleKey: string,
  accessToken: string,
  userId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const userScoped = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + accessToken } },
  });

  const { data: sessionActive, error: sessionError } = await userScoped.rpc("current_auth_session_is_active");
  if (sessionError || sessionActive !== true) {
    return { allowed: false, reason: "This sign-in session is no longer active. Sign in again on this device." };
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error } = await service
    .from("profiles")
    .select("is_admin,trial_expires_at,subscription_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !profile) return { allowed: false, reason: "Your study access could not be verified." };

  const row = profile as ProfileAccess;
  const now = Date.now();
  const trialActive = Boolean(row.trial_expires_at && Date.parse(row.trial_expires_at) > now);
  const subscriptionActive = Boolean(row.subscription_expires_at && Date.parse(row.subscription_expires_at) > now);
  if (row.is_admin || trialActive || subscriptionActive) return { allowed: true };
  return { allowed: false, reason: "Your free trial or subscription has ended. Activate your Rutex account to continue." };
}
