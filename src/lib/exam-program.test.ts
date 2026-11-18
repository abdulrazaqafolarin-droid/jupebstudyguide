import { describe, expect, it } from "vitest";
import { EXAM_PROGRAMS, getExamProgramRoute, getExamProgramStorageKey, getWorkspacePath, isExamProgramId, isJambWorkspacePath, isNavigationPathActive } from "./exam-program";
import { JAMB_CBT_PRACTICE_PRESETS, JAMB_FULL_MOCK_ENABLED, JAMB_SUBJECTS, JAMB_SYLLABUS_VERIFIED } from "./jamb-config";
import { JAMB_TUTOR_PROMPT } from "./jamb-prompts";

describe("separate JAMB workspace configuration", () => {
  it("recognizes only the supported examination programme IDs", () => {
    expect(isExamProgramId("jamb")).toBe(true);
    expect(isExamProgramId("jupeb")).toBe(true);
    expect(isExamProgramId("utme")).toBe(false);
    expect(isExamProgramId(null)).toBe(false);
  });

  it("keeps the JAMB route and storage namespace separate from JUPEB", () => {
    expect(getExamProgramRoute("jamb")).toBe("/jamb");
    expect(getExamProgramRoute("jupeb")).toBe("/");
    expect(getExamProgramStorageKey("user-1", "jamb", "bookmarks")).not.toBe(getExamProgramStorageKey("user-1", "jupeb", "bookmarks"));
    expect(EXAM_PROGRAMS.jamb.name).toBe("JAMB");
  });

  it("keeps shared account routes inside the active JAMB workspace", () => {
    expect(getWorkspacePath("/settings/profile", "jamb")).toBe("/jamb/settings/profile");
    expect(getWorkspacePath("/settings/security", "jamb")).toBe("/jamb/settings/security");
    expect(getWorkspacePath("/onboarding", "jamb")).toBe("/jamb/onboarding");
    expect(getWorkspacePath("/settings/profile", "jupeb")).toBe("/settings/profile");
    expect(isJambWorkspacePath("/jamb/settings/profile")).toBe(true);
    expect(isJambWorkspacePath("/jamb/settings/security")).toBe(true);
    expect(isJambWorkspacePath("/settings/profile")).toBe(false);
  });

  it("does not mark JAMB Home active on nested workspace routes", () => {
    expect(isNavigationPathActive("/jamb", "/jamb")).toBe(true);
    expect(isNavigationPathActive("/jamb/past-questions", "/jamb")).toBe(false);
    expect(isNavigationPathActive("/jamb/settings/profile", "/jamb")).toBe(false);
    expect(isNavigationPathActive("/jamb/settings/profile", "/jamb/settings/profile")).toBe(true);
    expect(isNavigationPathActive("/jamb/profile", "/jamb/profile")).toBe(true);
    expect(isNavigationPathActive("/settings/profile", "/")).toBe(false);
  });

  it("limits the initial pack to the three supplied science subjects", () => {
    expect(JAMB_SUBJECTS).toEqual(["physics", "chemistry", "biology"]);
  });

  it("keeps the practice presets bounded and the full mock disabled", () => {
    expect(JAMB_CBT_PRACTICE_PRESETS.map((item) => item.questionCount)).toEqual([10, 20, 40]);
    expect(JAMB_FULL_MOCK_ENABLED).toBe(false);
  });

  it("does not claim an unverified syllabus or mix the JUPEB curriculum into JAMB", () => {
    expect(JAMB_SYLLABUS_VERIFIED).toBe(false);
    expect(JAMB_TUTOR_PROMPT).toContain("Do not use JUPEB curriculum");
    expect(JAMB_TUTOR_PROMPT).toContain("ungraded");
  });
});