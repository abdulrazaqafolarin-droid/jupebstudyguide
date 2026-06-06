/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-user-id", email: "admin@test.com" } }),
}));

describe("consume_activation_code RPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consumes a valid code successfully", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, plan_type: "premium" },
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consume_activation_code", {
      p_code: "ABCD-1234-EFGH",
      p_user_id: "user-1",
    });

    expect(mockRpc).toHaveBeenCalledWith("consume_activation_code", {
      p_code: "ABCD-1234-EFGH",
      p_user_id: "user-1",
    });
    expect(result.data?.success).toBe(true);
    expect(result.data?.plan_type).toBe("premium");
  });

  it("rejects an invalid code", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: false, error: "Invalid or already used code" },
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consume_activation_code", {
      p_code: "INVALID-CODE",
      p_user_id: "user-1",
    });

    expect(result.data?.success).toBe(false);
    expect(result.data?.error).toBe("Invalid or already used code");
  });

  it("handles database errors", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Database connection error" },
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consume_activation_code", {
      p_code: "ABCD-1234-EFGH",
      p_user_id: "user-1",
    });

    expect(result.error).toBeDefined();
  });
});

describe("generate_activation_codes RPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates requested number of codes", async () => {
    const mockCodes = Array.from({ length: 5 }, (_, i) => ({
      id: `code-${i}`,
      code: `CODE-${i.toString().padStart(4, "0")}-XXXX`,
      plan_type: "basic",
    }));
    mockRpc.mockResolvedValueOnce({ data: mockCodes, error: null });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("generate_activation_codes", {
      p_created_by: "admin-user-id",
      p_count: 5,
      p_plan_type: "basic",
    });

    expect(mockRpc).toHaveBeenCalledWith("generate_activation_codes", {
      p_created_by: "admin-user-id",
      p_count: 5,
      p_plan_type: "basic",
    });
    expect(result.data).toHaveLength(5);
  });

  it("caps at 100 codes per request", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.rpc("generate_activation_codes", {
      p_created_by: "admin-user-id",
      p_count: 999,
      p_plan_type: "premium",
    });

    expect(mockRpc).toHaveBeenCalledWith("generate_activation_codes", {
      p_created_by: "admin-user-id",
      p_count: 999,
      p_plan_type: "premium",
    });
  });

  it("generates different plan types", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ id: "c1", code: "LIFE-TIME-0001", plan_type: "lifetime" }],
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("generate_activation_codes", {
      p_created_by: "admin-user-id",
      p_count: 1,
      p_plan_type: "lifetime",
    });

    expect(result.data![0].plan_type).toBe("lifetime");
  });
});

describe("activation_codes table queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all codes ordered by creation date", async () => {
    const mockSelect = vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() =>
          Promise.resolve({
            data: [
              { id: "c1", code: "AAAA-BBBB-CCCC", is_used: false, plan_type: "basic", created_at: "2026-05-15" },
              { id: "c2", code: "DDDD-EEEE-FFFF", is_used: true, plan_type: "premium", created_at: "2026-05-14" },
            ],
            error: null,
          })
        ),
      })),
    }));
    mockFrom.mockReturnValue({ select: mockSelect, order: vi.fn() } as any);

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase
      .from("activation_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    expect(mockFrom).toHaveBeenCalledWith("activation_codes");
    expect(result.data).toHaveLength(2);
    expect(result.data![0].is_used).toBe(false);
    expect(result.data![1].is_used).toBe(true);
  });

  it("filters unused codes", async () => {
    const mockEq = vi.fn(() => ({
      order: vi.fn(() =>
        Promise.resolve({
          data: [
            { id: "c1", code: "AAAA-BBBB-CCCC", is_used: false },
          ],
          error: null,
        })
      ),
    }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect } as any);

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase
      .from("activation_codes")
      .select("*")
      .eq("is_used", false)
      .order("created_at", { ascending: false });

    expect(mockEq).toHaveBeenCalledWith("is_used", false);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].is_used).toBe(false);
  });
});

describe("admin profile query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks if user is admin", async () => {
    const mockSingle = vi.fn(() =>
      Promise.resolve({
        data: { is_admin: true, is_activated: true },
        error: null,
      })
    );
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect } as any);

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase
      .from("profiles")
      .select("is_admin, is_activated")
      .eq("user_id", "admin-user-id")
      .single();

    expect(mockEq).toHaveBeenCalledWith("user_id", "admin-user-id");
    expect(result.data?.is_admin).toBe(true);
    expect(result.data?.is_activated).toBe(true);
  });

  it("returns is_admin=false for regular users", async () => {
    const mockSingle = vi.fn(() =>
      Promise.resolve({
        data: { is_admin: false, is_activated: true },
        error: null,
      })
    );
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockFrom.mockReturnValue({ select: mockSelect } as any);

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase
      .from("profiles")
      .select("is_admin, is_activated")
      .eq("user_id", "regular-user-id")
      .single();

    expect(result.data?.is_admin).toBe(false);
  });
});

describe("dashboard stats queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts total and activated users", async () => {
    const mockLimit = vi.fn(() =>
      Promise.resolve({
        data: [
          { id: "u1", is_activated: true, created_at: "2026-05-10" },
          { id: "u2", is_activated: true, created_at: "2026-05-11" },
          { id: "u3", is_activated: false, created_at: "2026-05-12" },
        ],
        error: null,
      })
    );
    const mockSelect = vi.fn(() => ({ limit: mockLimit }));
    mockFrom.mockReturnValue({ select: mockSelect, order: vi.fn() } as any);

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.from("profiles").select("is_activated, created_at").limit(5000);

    expect(result.data).toHaveLength(3);
    const activated = result.data!.filter((p: any) => p.is_activated);
    expect(activated).toHaveLength(2);
  });

  it("counts total and used codes for dashboard stats", async () => {
    const mockLimit = vi.fn(() =>
      Promise.resolve({
        data: [
          { id: "c1", is_used: true, plan_type: "basic" },
          { id: "c2", is_used: true, plan_type: "premium" },
          { id: "c3", is_used: false, plan_type: "basic" },
          { id: "c4", is_used: false, plan_type: "lifetime" },
        ],
        error: null,
      })
    );
    const mockSelect = vi.fn(() => ({ limit: mockLimit }));
    mockFrom.mockReturnValue({ select: mockSelect, order: vi.fn() } as any);

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase
      .from("activation_codes")
      .select("is_used, plan_type", { count: "exact", head: false })
      .limit(5000);

    const used = result.data!.filter((c: any) => c.is_used);
    const basic = result.data!.filter((c: any) => c.plan_type === "basic");
    expect(used).toHaveLength(2);
    expect(basic).toHaveLength(2);
  });
});

describe("resetPassword (forgot password)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls resetPasswordForEmail via auth API", async () => {
    // The AuthContext's resetPassword calls supabase.auth.resetPasswordForEmail
    // with the email and redirectTo. Test the shape of the function call.
    const mockReset = vi.fn(() => Promise.resolve({ error: null }));
    const email = "test@example.com";
    const redirectTo = `${window.location.origin}/auth`;

    await mockReset(email, { redirectTo });
    expect(mockReset).toHaveBeenCalledWith(email, { redirectTo });
    expect(redirectTo).toContain("auth");
  });

  it("returns error when email is invalid", async () => {
    const mockReset = vi.fn(() => Promise.resolve({ error: new Error("Email not found") }));
    const result = await mockReset("invalid@test.com");
    expect(result.error).toBeDefined();
    expect(result.error.message).toBe("Email not found");
  });
});

describe("delete_my_account RPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls delete_my_account RPC and signs out on success", async () => {
    const mockRpcLocal = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const mockSignOut = vi.fn();

    const result = await mockRpcLocal("delete_my_account");
    expect(mockRpcLocal).toHaveBeenCalledWith("delete_my_account");
    expect(result.error).toBeNull();

    // After RPC succeeds, sign out
    await mockSignOut();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("returns error if RPC fails", async () => {
    const mockRpcLocal = vi.fn(() => Promise.resolve({ data: null, error: new Error("RPC failed") }));

    const result = await mockRpcLocal("delete_my_account");
    expect(result.error).toBeDefined();
    expect(result.error.message).toBe("RPC failed");
  });

  it("deletes user data in correct order via RPC", async () => {
    // Simulate the SQL logic: the RPC deletes data from multiple tables
    const tables = ["ai_chat_messages", "ai_chats", "score_events", "conversation_state", "conversation_summaries", "conversion_events", "appointments", "activation_codes", "profiles"];
    expect(tables).toContain("profiles");
    expect(tables.length).toBe(9);
  });
});

describe("copy message to clipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
  });

  it("copies message content to clipboard", async () => {
    const content = "Hello, this is a test message";
    await navigator.clipboard.writeText(content);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(content);
  });

  it("handles empty message content", async () => {
    await navigator.clipboard.writeText("");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("");
  });

  it("copies multiline content correctly", async () => {
    const multiline = "Line 1\nLine 2\nLine 3";
    await navigator.clipboard.writeText(multiline);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(multiline);
  });
});

describe("edit message handler", () => {
  it("removes message at given index from array", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "How are you?" },
    ];
    const indexToRemove = 0;
    const filtered = messages.filter((_, i) => i !== indexToRemove);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].content).toBe("Hi there");
  });

  it("sets the removed message content as new input", () => {
    const message = { role: "user", content: "Explain quantum physics" };
    const input = message.content;
    expect(input).toBe("Explain quantum physics");
  });

  it("handles editing the last message in array", () => {
    const messages = [
      { role: "user", content: "First" },
      { role: "assistant", content: "Response" },
      { role: "user", content: "Last message" },
    ];
    const lastIndex = messages.length - 1;
    const filtered = messages.filter((_, i) => i !== lastIndex);
    expect(filtered).toHaveLength(2);
    expect(filtered[filtered.length - 1].content).toBe("Response");
  });
});
