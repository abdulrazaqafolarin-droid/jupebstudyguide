import React from "react";
import { Subject } from "@/types/question";
import { UserSubjectCombination } from "@/types/syllabus";
import { ProgrammeSyllabusSetup } from "@/components/syllabus/ProgrammeSyllabusSetup";
import { SUBJECT_INFO } from "@/types/question";

interface SyllabusSetupProps {
  onStart: (combination: UserSubjectCombination) => void;
  onCancel: () => void;
  /** Electives pre-picked from the onboarding flow (biology/math). */
  initialElectives?: Subject[];
}

/** JUPEB configuration for the shared programme syllabus setup surface. */
export const SyllabusSetup: React.FC<SyllabusSetupProps> = ({
  onStart,
  onCancel,
  initialElectives = [],
}) => (
  <ProgrammeSyllabusSetup<Subject>
    title="30-Day JUPEB Syllabus"
    requiredSubjects={(["physics", "chemistry"] as Subject[]).map((id) => ({
      id,
      name: SUBJECT_INFO[id].name,
      icon: SUBJECT_INFO[id].icon,
    }))}
    optionalSubjects={(["biology", "math"] as Subject[]).map((id) => ({
      id,
      name: SUBJECT_INFO[id].name,
      icon: SUBJECT_INFO[id].icon,
    }))}
    initialOptionalSubjects={initialElectives}
    minimumOptionalSelections={0}
    maximumOptionalSelections={2}
    onStart={(subjects) => onStart({
      core: subjects.filter((subject) => subject === "physics" || subject === "chemistry"),
      elective: subjects.filter((subject) => subject === "biology" || subject === "math"),
    })}
    onCancel={onCancel}
  />
);

export default SyllabusSetup;
