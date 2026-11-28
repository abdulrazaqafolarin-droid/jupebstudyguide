import { ProgrammeNewSessionModal } from "@/components/syllabus/ProgrammeNewSessionModal";
import { SUBJECT_INFO, type Subject } from "@/types/question";
import type { SyllabusSubjectChoice } from "@/components/syllabus/ProgrammeSyllabusSetup";

interface NewSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, subjects: Subject[], startDate: string, dailyGoalMinutes: number) => void;
}

const JUPEB_SUBJECTS: SyllabusSubjectChoice<Subject>[] = ([
  "physics", "chemistry", "biology", "math",
] as Subject[]).map((id) => ({
  id,
  name: SUBJECT_INFO[id].name,
  icon: SUBJECT_INFO[id].icon,
}));

/** JUPEB selection rules on the shared programme session modal. */
export function NewSessionModal({ open, onClose, onCreate }: NewSessionModalProps) {
  return (
    <ProgrammeNewSessionModal<Subject>
      open={open}
      onClose={onClose}
      onCreate={onCreate}
      selectableSubjects={JUPEB_SUBJECTS}
      minimumSelections={1}
      maximumSelections={2}
      subjectLabel="Subjects (select 1 or 2)"
      defaultGoalMinutes={30}
    />
  );
}

export default NewSessionModal;
