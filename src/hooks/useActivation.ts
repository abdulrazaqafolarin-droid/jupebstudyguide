import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SUPER_ADMIN_EMAIL } from "@/lib/adminEmail";
import { toast } from "sonner";
import { resolveActivationFailure, type ActivationStatusSnapshot } from "@/lib/activation-status";
import type { ExamProgramId } from "@/lib/exam-program";

export type ActivationStatus = ActivationStatusSnapshot;
const STALE_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
type CacheEntry = { status: ActivationStatus; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ActivationStatus>>();
const keyFor = (userId: string, programId: ExamProgramId) => `${userId}:${programId}`;

async function withTimeout<T>(request: (signal: AbortSignal) => PromiseLike<T>, label: string): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await request(controller.signal); }
  catch (error) {
    if (controller.signal.aborted) throw new Error(`${label} timed out. Check your connection and retry.`);
    throw error;
  } finally { window.clearTimeout(timer); }
}

async function loadActivation(user: { id: string; email?: string }, programId: ExamProgramId): Promise<ActivationStatus> {
  const key = keyFor(user.id, programId);
  const isAdminEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  try {
    const [profileResult, entitlementResult] = await Promise.all([
      withTimeout((signal) => supabase.from("profiles").select("is_admin").eq("user_id", user.id).abortSignal(signal).single(), "Profile check"),
      withTimeout((signal) => supabase.from("exam_program_entitlements").select("trial_expires_at,subscription_expires_at").eq("user_id", user.id).eq("exam_program_id", programId).abortSignal(signal).maybeSingle(), "Programme entitlement check"),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (entitlementResult.error) throw entitlementResult.error;
    const trialExpiry = entitlementResult.data?.trial_expires_at ?? null;
    const subscriptionExpiry = entitlementResult.data?.subscription_expires_at ?? null;
    return {
      is_activated: Boolean(subscriptionExpiry && Date.parse(subscriptionExpiry) > Date.now()),
      is_admin: isAdminEmail || profileResult.data?.is_admin === true,
      trial_expires_at: trialExpiry,
      subscription_expires_at: subscriptionExpiry,
      checking: false,
    };
  } catch (error) {
    console.error("Programme activation check failed:", error);
    return resolveActivationFailure(isAdminEmail, cache.get(key)?.status ?? null);
  }
}

function ensureActivationLoaded(user: { id: string; email?: string }, programId: ExamProgramId): Promise<ActivationStatus> {
  const key = keyFor(user.id, programId);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = loadActivation(user, programId).then((status) => {
      if (!status.check_error) cache.set(key, { status, fetchedAt: Date.now() });
      return status;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

export function useActivation(programId: ExamProgramId = "jupeb") {
  const { user } = useAuth();
  const key = user ? keyFor(user.id, programId) : "";
  const [snapshot, setSnapshot] = useState<{ key: string; status: ActivationStatus } | null>(() => {
    const cached = key ? cache.get(key) : null;
    return cached ? { key, status: cached.status } : null;
  });
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status: ActivationStatus = snapshot?.key === key && snapshot
    ? snapshot.status
    : { is_activated: false, is_admin: false, trial_expires_at: null, subscription_expires_at: null, checking: Boolean(user) };

  const checkStatus = useCallback(async (force = false) => {
    if (!user) { setSnapshot(null); return; }
    const currentKey = keyFor(user.id, programId);
    const cached = cache.get(currentKey);
    if (cached) {
      setSnapshot({ key: currentKey, status: cached.status });
      if (!force && Date.now() - cached.fetchedAt < STALE_MS) return;
    } else {
      setSnapshot({ key: currentKey, status: { is_activated: false, is_admin: false, trial_expires_at: null, subscription_expires_at: null, checking: true } });
    }
    const fresh = await ensureActivationLoaded(user, programId);
    setSnapshot({ key: currentKey, status: fresh });
  }, [user?.id, user?.email, programId]);

  useEffect(() => { void checkStatus(); }, [checkStatus]);

  const validateCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string; plan_type?: string }> => {
    if (!user) {
      const message = "You must be logged in to activate.";
      setError(message);
      return { success: false, error: message };
    }
    setValidating(true);
    setError(null);
    try {
      const { data, error: rpcError } = await withTimeout((signal) => supabase.rpc("consume_activation_code", {
        p_code: code.trim().toUpperCase(),
        p_user_id: user.id,
        p_exam_program_id: programId,
      }).abortSignal(signal), "Activation code validation");
      if (rpcError) throw rpcError;
      const result = data as Record<string, unknown> | null;
      if (!result?.success) {
        const message = typeof result?.error === "string" ? result.error : "Invalid code for this programme.";
        setError(message);
        return { success: false, error: message };
      }
      const next: ActivationStatus = {
        is_activated: true,
        is_admin: status.is_admin,
        trial_expires_at: null,
        subscription_expires_at: typeof result.subscription_expires_at === "string" ? result.subscription_expires_at : null,
        checking: false,
      };
      const currentKey = keyFor(user.id, programId);
      cache.set(currentKey, { status: next, fetchedAt: Date.now() });
      setSnapshot({ key: currentKey, status: next });
      return { success: true, plan_type: typeof result.plan_type === "string" ? result.plan_type : undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection error";
      setError(message);
      return { success: false, error: message };
    } finally { setValidating(false); }
  }, [user?.id, programId, status.is_admin]);

  const refreshStatus = useCallback(() => checkStatus(true), [checkStatus]);
  return { status, validating, error, validateCode, refreshStatus };
}

export interface ActivationCodeResult {
  id: string;
  code: string;
  plan_type: string | null;
  duration_days: number | null;
  exam_program_id: ExamProgramId;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  used_by_profile?: { user_id: string; display_name: string | null } | null;
}

export function useAdminCodes() {
  const [codes, setCodes] = useState<ActivationCodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const generateCodes = useCallback(async (count: number, durationDays: number, programId: ExamProgramId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-activation", {
        body: { action: "generate-codes", count, duration_days: durationDays, exam_program_id: programId },
      });
      if (error) throw error;
      const rows = Array.isArray(data?.codes) ? data.codes as Array<{ code: string; plan_type: string; duration_days: number }> : [];
      const generated: ActivationCodeResult[] = rows.map((row) => ({
        id: "", code: row.code, plan_type: row.plan_type, duration_days: row.duration_days,
        exam_program_id: programId, is_used: false, used_by: null, used_at: null,
        created_at: new Date().toISOString(),
      }));
      return { success: generated.length > 0, codes: generated, error: generated.length ? undefined : "No codes were returned." };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Could not generate activation codes." };
    } finally { setLoading(false); }
  }, []);

  const listCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("activation_codes")
        .select("id,code,plan_type,duration_days,exam_program_id,is_used,used_by,used_at,created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const enriched = (data ?? []).map((code) => ({ ...code, used_by_profile: null as ActivationCodeResult["used_by_profile"] }));
      const userIds = enriched.flatMap((code) => code.used_by ? [code.used_by] : []);
      if (userIds.length) {
        const { data: profiles, error: profileError } = await supabase.from("profiles")
          .select("user_id,display_name").in("user_id", userIds);
        if (profileError) throw profileError;
        const byId = Object.fromEntries((profiles ?? []).map((profile) => [profile.user_id, profile]));
        setCodes(enriched.map((code) => ({ ...code, used_by_profile: code.used_by ? byId[code.used_by] ?? null : null })));
      } else setCodes(enriched);
    } catch (error) {
      console.error("Failed to load activation codes:", error);
      toast.error("Failed to load activation codes");
    } finally { setLoading(false); }
  }, []);

  return { codes, loading, generateCodes, listCodes };
}