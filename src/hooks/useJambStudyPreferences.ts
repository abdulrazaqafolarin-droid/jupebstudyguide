import { useMemo } from "react";
import { useUserStorage } from "@/hooks/useUserStorage";
import {
  DEFAULT_JAMB_STUDY_PREFERENCES,
  normalizeJambStudyPreferences,
  type JambStudyPreferences,
} from "@/lib/jamb-study-preferences";

/** Account-local JAMB study preferences; deliberately separate from JUPEB keys. */
export function useJambStudyPreferences() {
  const [rawPreferences, setPreferences, { isReady, reset }] = useUserStorage<JambStudyPreferences>(
    "jamb-study-preferences",
    DEFAULT_JAMB_STUDY_PREFERENCES,
  );
  const preferences = useMemo(() => normalizeJambStudyPreferences(rawPreferences), [rawPreferences]);
  return { preferences, setPreferences, isReady, reset };
}
