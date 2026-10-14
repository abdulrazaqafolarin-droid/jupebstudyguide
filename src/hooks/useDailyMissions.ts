import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStorage } from "@/hooks/useUserStorage";
import { todayDateString } from "@/lib/daily-mission";
import {
  createDailyMission,
  type DailyMissionRecord,
} from "@/lib/daily-mission-engine";
import type { Question } from "@/types/question";
import type { DailyTask, StudySessionData } from "@/types/syllabus";

function mergeByLocalDate(
  local: DailyMissionRecord[],
  remote: DailyMissionRecord[],
): DailyMissionRecord[] {
  const byDate = new Map<string, DailyMissionRecord>();
  for (const mission of [...remote, ...local]) {
    const existing = byDate.get(mission.localDate);
    if (!existing || new Date(mission.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      byDate.set(mission.localDate, mission);
    }
  }
  return [...byDate.values()].sort((a, b) => a.localDate.localeCompare(b.localDate));
}

export function useDailyMissions() {
  const { user } = useAuth();
  const [missions, setMissions, storage] = useUserStorage<DailyMissionRecord[]>(
    "daily-mission-history",
    [],
  );
  const [remoteReady, setRemoteReady] = useState(false);
  const [today, setToday] = useState(() => todayDateString());
  const loadedUserRef = useRef<string | null>(null);
  const lastSyncHash = useRef("");
  const observedUserRef = useRef<string | null>(user?.id ?? null);
  const storageReadyForUserRef = useRef(false);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (observedUserRef.current !== currentUserId) {
      observedUserRef.current = currentUserId;
      storageReadyForUserRef.current = false;
      loadedUserRef.current = null;
      lastSyncHash.current = "";
      setRemoteReady(false);
      return;
    }
    if (storage.isReady) storageReadyForUserRef.current = true;
  }, [user?.id, storage.isReady]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const date = todayDateString();
      setToday((current) => current === date ? current : date);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!storage.isReady || !storageReadyForUserRef.current) return;
    if (!user) {
      setRemoteReady(true);
      loadedUserRef.current = null;
      return;
    }
    if (loadedUserRef.current === user.id) return;

    let cancelled = false;
    setRemoteReady(false);
    supabase
      .from("daily_missions")
      .select("local_date, mission")
      .eq("user_id", user.id)
      .order("local_date", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Daily mission restore failed:", error);
          setRemoteReady(true);
          loadedUserRef.current = user.id;
          return;
        }
        const remote = (data ?? [])
          .map((row) => row.mission as unknown as DailyMissionRecord)
          .filter((mission) => Boolean(mission?.localDate));
        setMissions((local) => mergeByLocalDate(local, remote));
        loadedUserRef.current = user.id;
        setRemoteReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, storage.isReady, setMissions]);

  useEffect(() => {
    if (!user || !storage.isReady || !storageReadyForUserRef.current || !remoteReady || loadedUserRef.current !== user.id || missions.length === 0) return;
    const hash = JSON.stringify(missions.map((mission) => [mission.localDate, mission.updatedAt]));
    if (hash === lastSyncHash.current) return;
    const timeout = window.setTimeout(() => {
      lastSyncHash.current = hash;
      const rows = missions.map((mission) => ({
        user_id: user.id,
        local_date: mission.localDate,
        mission: mission as unknown as import("@/integrations/supabase/types").Json,
        updated_at: mission.updatedAt,
      }));
      supabase
        .from("daily_missions")
        .upsert(rows, { onConflict: "user_id,local_date" })
        .then(({ error }) => {
          if (error) {
            console.error("Daily mission sync failed:", error);
            lastSyncHash.current = "";
          }
        });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [user, storage.isReady, remoteReady, missions]);

  const todayMission = useMemo(
    () => missions.find((mission) => mission.localDate === today) ?? null,
    [missions, today],
  );

  const startMission = useCallback(async (args: {
    session: StudySessionData;
    task: DailyTask;
    questions: Question[];
  }): Promise<DailyMissionRecord | null> => {
    const localDate = todayDateString();
    const existingLocal = missions.find((mission) => mission.localDate === localDate);
    if (existingLocal) return existingLocal;

    const candidate = createDailyMission({
      ...args,
      history: missions,
      localDate,
    });
    if (!candidate) return null;

    let chosen = candidate;
    if (user) {
      const { data, error } = await supabase
        .from("daily_missions")
        .insert({
          user_id: user.id,
          local_date: localDate,
          mission: candidate as unknown as import("@/integrations/supabase/types").Json,
          updated_at: candidate.updatedAt,
        })
        .select("mission")
        .single();

      if (!error && data) {
        chosen = data.mission as unknown as DailyMissionRecord;
      } else if (error.code === "23505") {
        const existing = await supabase
          .from("daily_missions")
          .select("mission")
          .eq("user_id", user.id)
          .eq("local_date", localDate)
          .maybeSingle();
        if (existing.data) chosen = existing.data.mission as unknown as DailyMissionRecord;
        else console.error("Could not recover existing daily mission:", existing.error);
      } else if (error) {
        // Keep the mission usable offline; the sync effect retries persistence.
        console.error("Daily mission creation deferred to sync:", error);
      }
    }

    setMissions((previous) => mergeByLocalDate(previous, [chosen]));
    return chosen;
  }, [missions, setMissions, user]);

  const updateMission = useCallback((
    missionId: string,
    update: (mission: DailyMissionRecord) => DailyMissionRecord,
  ) => {
    setMissions((previous) => previous.map((mission) => {
      if (mission.id !== missionId) return mission;
      const next = update(mission);
      return { ...next, updatedAt: new Date().toISOString() };
    }));
  }, [setMissions]);

  return {
    missions,
    todayMission,
    todayDate: today,
    ready: storage.isReady && remoteReady,
    startMission,
    updateMission,
  };
}
