import { useCallback, useEffect, useRef } from "react";
import { useUserStorage } from "@/hooks/useUserStorage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getJambTopicState,
  setJambTopicState,
  summarizeJambSyllabusProgress,
  reconcileJambSyllabusProgress,
  type JambSyllabusProgressMap,
  type JambSyllabusTopicState,
} from "@/lib/jamb-syllabus-progress";

const isTopicState = (value: string): value is JambSyllabusTopicState =>
  value === "not_started" || value === "in_progress" || value === "completed";

/**
 * Per-account JAMB syllabus progress, stored locally first and reconciled
 * with the owner/session-protected cloud table across devices.
 * This never reads or writes JUPEB syllabus progress.
 */
export function useJambSyllabusProgress() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress, { isReady }] = useUserStorage<JambSyllabusProgressMap>(
    "jamb-syllabus-progress-v1",
    {},
  );
  const progressRef = useRef(progress);
  const changeVersionRef = useRef(0);
  const syncNowRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (authLoading || !user?.id || !isReady) {
      syncNowRef.current = () => undefined;
      return;
    }
    let active = true;
    let syncInFlight = false;
    let syncRequested = false;

    const sync = async () => {
      if (syncInFlight) {
        syncRequested = true;
        return;
      }
      syncInFlight = true;
      const versionAtStart = changeVersionRef.current;
      try {
        const userId = user.id;
        const { data, error } = await supabase
          .from("exam_user_syllabus_progress")
          .select("topic_id,state,updated_at")
          .eq("user_id", userId)
          .eq("exam_program_id", "jamb");
        if (!active) return;
        if (error) {
          console.warn("[JAMB syllabus progress] Cloud sync unavailable; local progress is retained:", error.message);
          return;
        }

        const remote: JambSyllabusProgressMap = {};
        for (const row of data ?? []) {
          if (!isTopicState(row.state)) continue;
          const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
          remote[row.topic_id] = {
            state: row.state,
            updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
          };
        }

        // Read local state after the request resolves so a topic changed while
        // the network read was in flight is not overwritten by an older reply.
        const localSnapshot = progressRef.current;
        const { merged, pendingUpserts, pendingDeletes } = reconcileJambSyllabusProgress(localSnapshot, remote);
        if (JSON.stringify(merged) !== JSON.stringify(localSnapshot)) {
          progressRef.current = merged;
          setProgress(merged);
        }

        let cloudWriteSucceeded = pendingUpserts.length === 0;
        if (pendingUpserts.length > 0) {
          const { error: writeError } = await supabase
            .from("exam_user_syllabus_progress")
            .upsert(
              pendingUpserts.map(([topicId, entry]) => ({
                user_id: userId,
                exam_program_id: "jamb",
                topic_id: topicId,
                state: entry.state,
                updated_at: new Date(entry.updatedAt).toISOString(),
              })),
              { onConflict: "user_id,exam_program_id,topic_id" },
            );
          cloudWriteSucceeded = !writeError;
          if (writeError) {
            console.warn("[JAMB syllabus progress] Could not upload local changes; they will retry:", writeError.message);
          }
        }

        // A legacy row is removed only after its canonical replacement has
        // been written successfully. Failed writes remain available to retry.
        if (cloudWriteSucceeded && pendingDeletes.length > 0) {
          const { error: deleteError } = await supabase
            .from("exam_user_syllabus_progress")
            .delete()
            .eq("user_id", userId)
            .eq("exam_program_id", "jamb")
            .in("topic_id", pendingDeletes);
          if (deleteError) {
            console.warn("[JAMB syllabus progress] Could not remove migrated legacy topic rows; they will retry:", deleteError.message);
          }
        }
      } finally {
        syncInFlight = false;
        if ((syncRequested || changeVersionRef.current !== versionAtStart) && active) {
          syncRequested = false;
          void sync();
        }
      }
    };

    syncNowRef.current = () => { void sync(); };
    void sync();
    const syncOnline = () => { void sync(); };
    const syncVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", syncOnline);
    window.addEventListener("focus", syncOnline);
    document.addEventListener("visibilitychange", syncVisible);
    return () => {
      active = false;
      syncNowRef.current = () => undefined;
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("focus", syncOnline);
      document.removeEventListener("visibilitychange", syncVisible);
    };
  }, [user?.id, authLoading, isReady, setProgress]);

  const setTopicState = useCallback((topicId: string, state: JambSyllabusTopicState) => {
    if (!isReady || !topicId.trim()) return;
    changeVersionRef.current += 1;
    // Update the ref synchronously: the immediate sync then reads this change
    // instead of waiting for React's next render/effect cycle.
    const next = setJambTopicState(progressRef.current, topicId, state);
    progressRef.current = next;
    setProgress(next);
    syncNowRef.current();
  }, [isReady, setProgress]);

  const getTopicState = useCallback((topicId: string) => (
    getJambTopicState(progress, topicId)
  ), [progress]);

  const getSummary = useCallback((topicIds: string[]) => (
    summarizeJambSyllabusProgress(topicIds, progress)
  ), [progress]);

  return { progress, setTopicState, getTopicState, getSummary, isReady };
}
