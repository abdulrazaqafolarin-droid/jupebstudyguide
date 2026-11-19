import { createClient } from "npm:@supabase/supabase-js@2";

interface ProfileAccess { is_admin: boolean | null }
interface ProgrammeEntitlement {
  trial_expires_at: string | null;
  subscription_expires_at: string | null;
}

/** Verify an active device session and an entitlement for the requested programme. */
export async function hasActiveStudyAccess(
  supabaseUrl: string,
  serviceRoleKey: string,
  accessToken: string,
  userId: string,
  examProgramId: "jupeb" | "jamb",
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
  const [profileResult, entitlementResult] = await Promise.all([
    service.from("profiles").select("is_admin").eq("user_id", userId).maybeSingle(),
    service.from("exam_program_entitlements")
      .select("trial_expires_at,subscription_expires_at")
      .eq("user_id", userId)
      .eq("exam_program_id", examProgramId)
      .maybeSingle(),
  ]);
  if (profileResult.error || entitlementResult.error || !profileResult.data) {
    return { allowed: false, reason: "Your programme access could not be verified." };
  }
  const profile = profileResult.data as ProfileAccess;
  const entitlement = entitlementResult.data as ProgrammeEntitlement | null;
  const now = Date.now();
  const active = (value: string | null | undefined) => {
    if (!value) return false;
    const expiry = Date.parse(value);
    return Number.isFinite(expiry) && expiry > now;
  };
  if (profile.is_admin || active(entitlement?.trial_expires_at) || active(entitlement?.subscription_expires_at)) {
    return { allowed: true };
  }
  return { allowed: false, reason: `Your ${examProgramId.toUpperCase()} trial or subscription has ended. Activate this programme to continue.` };
}
