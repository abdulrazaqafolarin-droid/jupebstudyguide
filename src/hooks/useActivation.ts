import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SUPER_ADMIN_EMAIL } from "@/lib/adminEmail";
import { toast } from "sonner";

export interface ActivationStatus {
  is_activated: boolean;
  is_admin: boolean;
  checking: boolean;
}

export function useActivation() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ActivationStatus>({ is_activated: false, is_admin: false, checking: true });
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const checkStatus = useCallback(async () => {
    if (!user) {
      setStatus({ is_activated: false, is_admin: false, checking: false });
      fetchedRef.current = false;
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const isAdminEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_activated, is_admin")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (isAdminEmail && !data?.is_admin) {
        await supabase.from("profiles").update({ is_admin: true }).eq("user_id", user.id);
      }

      setStatus({
        is_activated: data?.is_activated ?? false,
        is_admin: isAdminEmail || (data?.is_admin ?? false),
        checking: false,
      });
    } catch (err) {
      console.error("Activation check error:", err);
      setStatus({
        is_activated: false,
        is_admin: isAdminEmail,
        checking: false,
      });
    }
  }, [user]);

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
      const { data, error: rpcError } = await supabase.rpc("consume_activation_code", {
        p_code: normalized,
        p_user_id: user.id,
      });

      if (rpcError) {
        const msg = rpcError.message;
        setError(msg);
        setValidating(false);
        return { success: false, error: msg };
      }

      const result = data as Record<string, unknown> | null;
      if (result?.success) {
        setStatus({ is_activated: true, is_admin: status.is_admin, checking: false });
        setValidating(false);
        return { success: true, plan_type: typeof result.plan_type === "string" ? result.plan_type : undefined };
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

  return { status, validating, error, validateCode, refreshStatus: checkStatus };
}

export interface ActivationCodeResult {
  id: string;
  code: string;
  plan_type: string | null;
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

  const generateCodes = useCallback(async (count: number, plan_type: string): Promise<{ success: boolean; codes?: ActivationCodeResult[]; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("generate_activation_codes", {
        p_created_by: user?.id,
        p_count: Math.min(count, 100),
        p_plan_type: plan_type,
        p_admin_email: SUPER_ADMIN_EMAIL || null,
      });

      if (error) {
        console.error("generate_activation_codes RPC error:", error);
        setLoading(false);
        return { success: false, error: error.message };
      }

      const rows = (data || []) as Array<{ code: string; plan_type: string; expires_at: string | null }>;
      const mapped: ActivationCodeResult[] = rows.map((r) => ({
        id: "", code: r.code, plan_type: r.plan_type, is_used: false,
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
        .select("id, code, plan_type, is_used, used_by, used_at, created_at")
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
