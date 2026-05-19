import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivationStatus {
  is_activated: boolean;
  is_admin: boolean;
  checking: boolean;
}

export function useActivation() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ActivationStatus>({
    is_activated: false,
    is_admin: false,
    checking: true,
  });
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckRef = useRef<string | null>(null);

  const SUPER_ADMIN_EMAIL = "abdulrazaqafolarin@gmail.com";

  const checkStatus = useCallback(async () => {
    if (!user) {
      setStatus({ is_activated: false, is_admin: false, checking: false });
      return;
    }

    if (lastCheckRef.current === user.id) return;
    lastCheckRef.current = user.id;

    const isAdminEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_activated, is_admin")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (isAdminEmail && !data?.is_admin) {
        supabase.from("profiles").update({ is_admin: true }).eq("user_id", user.id).catch(() => {});
      }

      setStatus({
        is_activated: data?.is_activated ?? false,
        is_admin: isAdminEmail || (data?.is_admin ?? false),
        checking: false,
      });
    } catch {
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
    setValidating(true);
    setError(null);

    try {
      const normalized = code.trim().toUpperCase();
      const { data, error: rpcError } = await supabase.rpc("consume_activation_code", {
        p_code: normalized,
        p_user_id: user?.id,
      });

      if (rpcError) {
        const msg = rpcError.message;
        setError(msg);
        setValidating(false);
        return { success: false, error: msg };
      }

      const result = data as any;
      if (result?.success) {
        setStatus(prev => ({ ...prev, is_activated: true }));
        setValidating(false);
        return { success: true, plan_type: result.plan_type };
      } else {
        const msg = result?.error || "Invalid code";
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
  }, [user]);

  return { status, validating, error, validateCode, refreshStatus: checkStatus };
}

export function useAdminCodes() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const generateCodes = useCallback(async (count: number, plan_type: string): Promise<{ success: boolean; codes?: any[]; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("generate_activation_codes", {
        p_created_by: user?.id,
        p_count: Math.min(count, 100),
        p_plan_type: plan_type,
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      setLoading(false);
      return { success: true, codes: data as any[] };
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const enriched = (rawCodes || []).map((c: any) => ({ ...c, used_by_profile: null }));
      const usedUserIds = enriched.filter((c: any) => c.used_by).map((c: any) => c.used_by);

      if (usedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", usedUserIds);

        const profileMap = Object.fromEntries(
          (profiles || []).map((p: any) => [p.user_id, p])
        );

        setCodes(enriched.map((c: any) => ({
          ...c,
          used_by_profile: c.used_by ? profileMap[c.used_by] || null : null,
        })));
      } else {
        setCodes(enriched);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  return { codes, loading, generateCodes, listCodes };
}
