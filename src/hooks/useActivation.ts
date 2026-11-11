import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SUPER_ADMIN_EMAIL } from "@/lib/adminEmail";
import { toast } from "sonner";
import { resolveActivationFailure, type ActivationStatusSnapshot } from "@/lib/activation-status";

export type ActivationStatus = ActivationStatusSnapshot;

const ACTIVATION_REQUEST_TIMEOUT_MS = 15_000;

async function withActivationTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  action: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ACTIVATION_REQUEST_TIMEOUT_MS);
  try {
    return await request(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${action} timed out. Check your connection and retry.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Session-level activation cache.
//
// The activation gate wraps every protected route, and routes remount on each
// navigation — with a per-instance fetch that meant a full-screen network
// spinner ("Checking activation...") stalled between EVERY page switch.
// Activation rarely changes, so it is checked once per user: later mounts read
// the cache synchronously (checking: false) and only revalidate in the
// background after ACTIVATION_STALE_MS. Failures are never cached, so a
// dropped connection still recovers on the next mount instead of pinning a
// stale "not activated" result over a working account.
// ---------------------------------------------------------------------------
type ActivationCacheEntry = {
  userId: string;
  status: ActivationStatus; // always checking: false
  fetchedAt: number;
};

const ACTIVATION_STALE_MS = 5 * 60 * 1000;
let activationCache: ActivationCacheEntry | null = null;
let activationInFlight: { userId: string; promise: Promise<ActivationStatus> } | null = null;

async function loadActivation(user: { id: string; email?: string }): Promise<{
  status: ActivationStatus;
  cacheable: boolean;
}> {
  const isAdminEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  try {
    const { data, error } = await withActivationTimeout(
      (signal) => supabase
        .from("profiles")
        .select("is_activated, is_admin, trial_expires_at, subscription_expires_at, subscription_duration_days")
        .eq("user_id", user.id)
        .abortSignal(signal)
        .single(),
      "Activation check",
    );

    if (error) throw error;

    // Admin status is granted only by trusted server-side configuration or
    // an administrator-managed profile flag. Never promote a profile from
    // the client: users can update their own profile fields through RLS.
    return {
      status: {
        is_activated: data?.is_activated ?? false,
        is_admin: isAdminEmail && (data?.is_admin ?? false),
        trial_expires_at: data?.trial_expires_at ?? null,
        subscription_expires_at: data?.subscription_expires_at ?? null,
        subscription_duration_days: data?.subscription_duration_days ?? null,
        checking: false,
      },
      cacheable: true,
    };
  } catch (err) {
    console.error("Activation check error:", err);
    const cached = activationCache?.userId === user.id ? activationCache.status : null;
    return {
      status: resolveActivationFailure(isAdminEmail, cached),
      cacheable: false,
    };
  }
}

/** One shared in-flight check per user (multiple mounts await the same promise). */
function ensureActivationLoaded(user: { id: string; email?: string }): Promise<ActivationStatus> {
  if (!activationInFlight || activationInFlight.userId !== user.id) {
    const promise = loadActivation(user)
      .then(({ status, cacheable }) => {
        if (cacheable) {
          activationCache = { userId: user.id, status, fetchedAt: Date.now() };
        }
        return status;
      })
      .finally(() => {
        if (activationInFlight?.userId === user.id) activationInFlight = null;
      });
    activationInFlight = { userId: user.id, promise };
  }
  return activationInFlight.promise;
}

export function useActivation() {
  const { user } = useAuth();
  const cachedForUser = user && activationCache?.userId === user.id ? activationCache : null;
  const [status, setStatus] = useState<ActivationStatus>(
    cachedForUser
      ? cachedForUser.status
      : { is_activated: false, is_admin: false, trial_expires_at: null, subscription_expires_at: null, subscription_duration_days: null, checking: !!user },
  );
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(
    async (force = false) => {
      if (!user) {
        activationCache = null;
        setStatus({ is_activated: false, is_admin: false, trial_expires_at: null, subscription_expires_at: null, subscription_duration_days: null, checking: false });
        return;
      }

      const cached = activationCache?.userId === user.id ? activationCache : null;
      if (cached) {
        // Instant read: navigation never waits on the network again.
        setStatus(cached.status);
        if (!force && Date.now() - cached.fetchedAt < ACTIVATION_STALE_MS) return;
        // Stale → revalidate in the background without hiding trusted access.
      } else {
        // No verified snapshot exists yet. Show a loader while the first
        // request is in flight, then render a retry state if it fails.
        setStatus((previous) => ({ ...previous, checking: true, check_error: false }));
      }

      const fresh = await ensureActivationLoaded(user);
      setStatus(fresh);
    },
    [user],
  );

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const validateCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string; plan_type?: string }> => {
    if (!user) {
      setError("You must be logged in to activate.");
      setValidating(false);
      return { success: false, error: "Not authenticated" };
    }

    setValidating(true);
    setError(null);

    try {
      const normalized = code.trim().toUpperCase();
      const { data, error: rpcError } = await withActivationTimeout(
        (signal) => supabase.rpc("consume_activation_code", {
          p_code: normalized,
          p_user_id: user.id,
        }).abortSignal(signal),
        "Activation code validation",
      );

      if (rpcError) {
        const msg = rpcError.message;
        setError(msg);
        setValidating(false);
        return { success: false, error: msg };
      }

      const result = data as Record<string, unknown> | null;
      if (result?.success) {
        const next: ActivationStatus = { is_activated: true, is_admin: status.is_admin, trial_expires_at: null, subscription_expires_at: typeof result.subscription_expires_at === 'string' ? result.subscription_expires_at : null, subscription_duration_days: typeof result.duration_days === 'number' ? result.duration_days : null, checking: false };
        activationCache = { userId: user.id, status: next, fetchedAt: Date.now() };
        setStatus(next);
        setValidating(false);
        return { success: true, plan_type: typeof result.plan_type === "string" ? result.plan_type : undefined, duration_days: typeof result.duration_days === "number" ? result.duration_days : undefined };
      } else {
        const msg = typeof result?.error === "string" && result.error ? result.error : "Invalid code";
        setError(msg);
        setValidating(false);
        return { success: false, error: msg };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error";
      setError(msg);
      setValidating(false);
      return { success: false, error: msg };
    }
  }, [user, status.is_admin]);

  const refreshStatus = useCallback(() => checkStatus(true), [checkStatus]);

  return { status, validating, error, validateCode, refreshStatus };
}

export interface ActivationCodeResult {
  id: string;
  code: string;
  plan_type: string | null;
  duration_days: number | null;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  used_by_profile?: { user_id: string; display_name: string } | null;
}

export function useAdminCodes() {
  const [codes, setCodes] = useState<ActivationCodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const generateCodes = useCallback(async (count: number, duration_days: number): Promise<{ success: boolean; codes?: ActivationCodeResult[]; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-activation", {
        body: { action: "generate-codes", count: Math.min(count, 100), duration_days },
      });

      if (error) {
        console.error("generate_activation_codes RPC error:", error);
        setLoading(false);
        return { success: false, error: error.message };
      }

      const rows = (data?.codes || []) as Array<{ code: string; plan_type: string; duration_days: number }>;
      const mapped: ActivationCodeResult[] = rows.map((r) => ({
        id: "", code: r.code, plan_type: r.plan_type, duration_days: r.duration_days, is_used: false,
        used_by: null, used_at: null, created_at: new Date().toISOString(),
      }));
      setLoading(false);
      return { success: true, codes: mapped };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err instanceof Error ? err.message : "Error" };
    }
  }, [user]);

  const listCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rawCodes, error } = await supabase
        .from("activation_codes")
        .select("id, code, plan_type, duration_days, is_used, used_by, used_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const enriched = (rawCodes || []).map((c: ActivationCodeResult) => ({ ...c, used_by_profile: null as { user_id: string; display_name: string } | null }));
      const usedUserIds = enriched.filter((c) => c.used_by).map((c) => c.used_by!);

      if (usedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", usedUserIds);

        const profileMap = Object.fromEntries(
          (profiles || []).map((p: { user_id: string; display_name: string }) => [p.user_id, p])
        );

        setCodes(enriched.map((c: ActivationCodeResult) => ({
          ...c,
          used_by_profile: c.used_by ? profileMap[c.used_by] || null : null,
        })));
      } else {
        setCodes(enriched);
      }
    } catch (err) {
      console.error("Failed to list activation codes:", err);
      toast.error("Failed to load activation codes");
    }
    setLoading(false);
  }, []);

  return { codes, loading, generateCodes, listCodes };
}
