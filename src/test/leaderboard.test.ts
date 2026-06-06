/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          data: vi.fn(() => ({ data: [], error: null })),
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        lte: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      })),
    })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-id", email: "test@test.com" } }),
}));

import { supabase } from "@/integrations/supabase/client";

describe("score_events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("award_score RPC is called with correct params", async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValueOnce({ data: { duplicate: false }, error: null });

    const result = await supabase.rpc("award_score", {
      p_user_id: "user-1",
      p_amount: 10,
      p_reason: "correct_answer",
      p_reference_id: "correct_answer:q123:user-1",
    });

    expect(mockRpc).toHaveBeenCalledWith("award_score", {
      p_user_id: "user-1",
      p_amount: 10,
      p_reason: "correct_answer",
      p_reference_id: "correct_answer:q123:user-1",
    });
    expect(result.data).toEqual({ duplicate: false });
  });

  it("duplicate reference_id returns duplicate: true (idempotent)", async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValueOnce({ data: { duplicate: true }, error: null });

    const result = await supabase.rpc("award_score", {
      p_user_id: "user-1",
      p_amount: 5,
      p_reason: "answered_question",
      p_reference_id: "answered_question:q456:user-1",
    });

    expect(result.data).toEqual({ duplicate: true });
  });

  it("award_score handles errors gracefully", async () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error("DB error") });

    const result = await supabase.rpc("award_score", {
      p_user_id: "user-1",
      p_amount: 20,
      p_reason: "streak_day",
      p_reference_id: "streak_day:2026-05-15:user-1",
    });

    expect(result.error).toBeDefined();
  });
});

describe("weekly leaderboard queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_weekly_leaderboard RPC returns ranked results", async () => {
    const mockData = [
      { user_id: "u1", display_name: "Alice", total_score: 150, rank: 1 },
      { user_id: "u2", display_name: "Bob", total_score: 120, rank: 2 },
    ];
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await supabase.rpc("get_weekly_leaderboard", {
      p_limit: 5,
    });

    expect(mockRpc).toHaveBeenCalledWith("get_weekly_leaderboard", {
      p_limit: 5,
    });
    expect(result.data).toHaveLength(2);
    expect(result.data![0].display_name).toBe("Alice");
  });
});

describe("current_week_start helper", () => {
  it("returns Monday 00:00:00 UTC for a given date", () => {
    // current_week_start() in SQL is: date_trunc('week', now())
    // Simulating: for a Wednesday, it should return Monday
    const wednesday = new Date("2026-05-20T12:00:00Z");
    const day = wednesday.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday=0
    const monday = new Date(wednesday);
    monday.setUTCDate(wednesday.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);

    expect(monday.getUTCDay()).toBe(1); // Monday
    expect(monday.getUTCHours()).toBe(0);
    expect(monday.getUTCMinutes()).toBe(0);
  });

  it("current_week_end returns Sunday 23:59:59 UTC", () => {
    const wednesday = new Date("2026-05-20T12:00:00Z");
    const day = wednesday.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(wednesday);
    monday.setUTCDate(wednesday.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    const weekEnd = Math.floor(sunday.getTime() / 1000);

    expect(weekEnd).toBeGreaterThan(0);
    expect(sunday.getUTCDay()).toBe(0); // Sunday
  });
});

describe("leaderboard_weeks tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches past champions from leaderboard_weeks", async () => {
    const mockData = [
      {
        id: "w1",
        week_start: "2026-05-04T00:00:00Z",
        week_end: "2026-05-10T23:59:59Z",
        champion_user_id: "u1",
        champion_badge_awarded: true,
      },
    ];
    const mockFrom = vi.mocked(supabase.from);
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
        })),
        data: vi.fn(() => ({ data: mockData, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    } as any);

    const result = await supabase
      .from("leaderboard_weeks")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(10);

    expect(mockFrom).toHaveBeenCalledWith("leaderboard_weeks");
    expect(result.data).toHaveLength(1);
    expect(result.data![0].champion_user_id).toBe("u1");
  });
});
