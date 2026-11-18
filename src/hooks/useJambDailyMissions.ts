import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserStorage } from "@/hooks/useUserStorage";
import {
  mergeJambMissionHistory,
  type JambDailyMissionRecord,
} from "@/lib/jamb-daily-mission";

type RemoteMissionRow = {
  local_date: string;
  subject: string;
  mission: JambDailyMissionRecord;
};

function missingRemoteTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" ||
    /jamb_daily_missions.*(does not exist|not find|schema cache)|could not find the table/i.test(error.message ?? "");
}

export function useJambDailyMissions() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory, storage] = useUserStorage<JambDailyMissionRecord[]>(
    "jamb-daily-mission-history",
    [],
  );
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteSupported, setRemoteSupported] = useState(true);
  const [syncSignal, setSyncSignal] = useState(0);
  const loadedUserRef = useRef<string | null>(null);
  const observedUserRef = useRef<string | null>(user?.id ?? null);
  const syncHashRef = useRef("");
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const syncFailedRef = useRef(false);

  useEffect(() => {
    const requestRetry = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      setSyncSignal((current) => current + 1);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") requestRetry();
    };
    window.addEventListener("online", requestRetry);
    window.addEventListener("focus", requestRetry);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", requestRetry);
      window.removeEventListener("focus", requestRetry);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (observedUserRef.current !== userId) {
      observedUserRef.current = userId;
      loadedUserRef.current = null;
      syncHashRef.current = "";
      syncFailedRef.current = false;
      setRemoteReady(false);
      return;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!storage.isReady || authLoading) return;
    if (!user) {
      loadedUserRef.current = null;
      setRemoteReady(true);
      return;
    }
    if (loadedUserRef.current === user.id) return;

    let cancelled = false;
    setRemoteReady(false);
    supabase
      .from("jamb_daily_missions")
      .select("local_date, subject, mission")
      .eq("user_id", user.id)
      .order("local_date", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          if (missingRemoteTable(error)) {
            setRemoteSupported(false);
          } else {
            console.warn("JAMB mission history restore failed; local history remains available:", error);
          }
          loadedUserRef.current = user.id;
          setRemoteReady(true);
          return;
        }
        const remote = (data ?? []).map((row) => (row as unknown as RemoteMissionRow).mission);
        setHistory((local) => mergeJambMissionHistory(local, remote));
        loadedUserRef.current = user.id;
        setRemoteReady(true);
      });

    return () => { cancelled = true; };
  }, [authLoading, storage.isReady, user, setHistory]);

  useEffect(() => {
    if (!user || !storage.isReady || !remoteReady || !remoteSupported || loadedUserRef.current !== user.id || history.length === 0) return;
    const hash = JSON.stringify(history.map((mission) => [mission.id, mission.updatedAt]));
    if (hash === syncHashRef.current) return;

    const timeout = window.setTimeout(() => {
      syncHashRef.current = hash;
      const rows = history.map((mission) => ({
        user_id: user.id,
        local_date: mission.localDate,
        subject: mission.subject,
        mission: mission as unknown as import("@/integrations/supabase/types").Json,
        updated_at: mission.updatedAt,
      }));
      syncQueueRef.current = syncQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const { error } = await supabase
            .from("jamb_daily_missions")
            .upsert(rows, { onConflict: "user_id,local_date,subject" });
          if (error) {
            console.warn("JAMB mission history sync failed:", error);
            syncHashRef.current = "";
            if (missingRemoteTable(error)) setRemoteSupported(false);
            if (!syncFailedRef.current) {
              syncFailedRef.current = true;
              toast.error("JAMB mission history is saved on this device and will sync when cloud history is available.");
            }
          } else {
            syncFailedRef.current = false;
          }
        });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [history, remoteReady, remoteSupported, storage.isReady, syncSignal, user]);

  const createMission = useCallback(async (candidate: JambDailyMissionRecord) => {
    const existing = history.find((mission) => mission.id === candidate.id);
    if (existing) return existing;

    let chosen = candidate;
    if (user && remoteSupported && remoteReady) {
      const { data, error } = await supabase
        .from("jamb_daily_missions")
        .insert({
          user_id: user.id,
          local_date: candidate.localDate,
          subject: candidate.subject,
          mission: candidate as unknown as import("@/integrations/supabase/types").Json,
          updated_at: candidate.updatedAt,
        })
        .select("mission")
        .single();
      if (!error && data) {
        chosen = data.mission as unknown as JambDailyMissionRecord;
      } else if (error?.code === "23505") {
        const existingRemote = await supabase
          .from("jamb_daily_missions")
          .select("mission")
          .eq("user_id", user.id)
          .eq("local_date", candidate.localDate)
          .eq("subject", candidate.subject)
          .maybeSingle();
        if (existingRemote.data) chosen = existingRemote.data.mission as unknown as JambDailyMissionRecord;
      } else if (error) {
        if (missingRemoteTable(error)) setRemoteSupported(false);
        console.warn("JAMB mission cloud creation deferred to local sync:", error);
      }
    }

    setHistory((previous) => mergeJambMissionHistory(previous, [chosen]));
    return chosen;
  }, [history, remoteReady, remoteSupported, setHistory, user]);

  const updateMission = useCallback((
    missionId: string,
    update: (mission: JambDailyMissionRecord) => JambDailyMissionRecord,
  ) => {
    setHistory((previous) => previous.map((mission) => {
      if (mission.id !== missionId) return mission;
      const updated = update(mission);
      return { ...updated, updatedAt: new Date().toISOString() };
    }));
  }, [setHistory]);

  return {
    history,
    ready: storage.isReady && remoteReady,
    remoteSupported,
    createMission,
    updateMission,
  };
}
