import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { EXAM_PROGRAMS, type ExamProgramId } from "@/lib/exam-program";

interface ExamProgramContextValue {
  programId: ExamProgramId;
  program: (typeof EXAM_PROGRAMS)[ExamProgramId];
  isJambWorkspace: boolean;
}

const ExamProgramContext = createContext<ExamProgramContextValue>({
  programId: "jupeb",
  program: EXAM_PROGRAMS.jupeb,
  isJambWorkspace: false,
});

export function ExamProgramProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const programId: ExamProgramId = pathname === "/jamb" || pathname.startsWith("/jamb/")
    ? "jamb"
    : "jupeb";

  const value = useMemo<ExamProgramContextValue>(() => ({
    programId,
    program: EXAM_PROGRAMS[programId],
    isJambWorkspace: programId === "jamb",
  }), [programId]);

  return <ExamProgramContext.Provider value={value}>{children}</ExamProgramContext.Provider>;
}

export function useExamProgram(): ExamProgramContextValue {
  return useContext(ExamProgramContext);
}
