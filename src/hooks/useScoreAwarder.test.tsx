import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  user: { id: "student-123" } as { id: string } | null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

import { useScoreAwarder } from "./useScoreAwarder";

describe("useScoreAwarder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: "student-123" };
    mocks.rpc.mockResolvedValue({
      data: {
        success: true,
        attempt_awarded: true,
        correct_awarded: true,
        is_correct: true,
        duplicate: false,
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends only the official question ID and submitted answer to the database", async () => {
    const { result } = renderHook(() => useScoreAwarder());

    let awarded = false;
    await act(async () => {
      awarded = await result.current.recordQuestionAttempt("PHY-2024-001", "B");
    });

    expect(awarded).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("record_question_attempt", {
      p_question_id: "PHY-2024-001",
      p_answer: "B",
    });
    const sentArgs = mocks.rpc.mock.calls[0][1];
    expect(sentArgs).not.toHaveProperty("p_user_id");
    expect(sentArgs).not.toHaveProperty("p_amount");
    expect(sentArgs).not.toHaveProperty("p_reason");
    expect(sentArgs).not.toHaveProperty("p_is_correct");
  });

  it("does not award points for blank or whitespace-only answers", async () => {
    const { result } = renderHook(() => useScoreAwarder());

    let blankResult = true;
    let whitespaceResult = true;
    await act(async () => {
      blankResult = await result.current.recordQuestionAttempt("PHY-2024-001", "");
      whitespaceResult = await result.current.recordQuestionAttempt("PHY-2024-002", "   ");
    });

    expect(blankResult).toBe(false);
    expect(whitespaceResult).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not call the reward RPC without a signed-in user", async () => {
    mocks.user = null;
    const { result } = renderHook(() => useScoreAwarder());

    let awarded = true;
    await act(async () => {
      awarded = await result.current.recordQuestionAttempt("PHY-2024-001", "B");
    });

    expect(awarded).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns false for a duplicate reward that the database has already recorded", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        success: true,
        attempt_awarded: false,
        correct_awarded: false,
        is_correct: true,
        duplicate: true,
      },
      error: null,
    });
    const { result } = renderHook(() => useScoreAwarder());

    let awarded = true;
    await act(async () => {
      awarded = await result.current.recordQuestionAttempt("PHY-2024-001", "B");
    });

    expect(awarded).toBe(false);
  });


  it("does not report points for a question outside the official bank", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        success: false,
        eligible_for_points: false,
        attempt_awarded: false,
        correct_awarded: false,
        duplicate: false,
      },
      error: null,
    });
    const { result } = renderHook(() => useScoreAwarder());

    let awarded = true;
    await act(async () => {
      awarded = await result.current.recordQuestionAttempt("custom-question-uuid", "A");
    });

    expect(awarded).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith("record_question_attempt", {
      p_question_id: "custom-question-uuid",
      p_answer: "A",
    });
  });

  it("fails closed when the database rejects a reward request", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "Question is unavailable for scoring" },
    });
    const { result } = renderHook(() => useScoreAwarder());

    let awarded = true;
    await act(async () => {
      awarded = await result.current.recordQuestionAttempt("deleted-question", "B");
    });

    expect(awarded).toBe(false);
  });
});
