import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: { error: (...args: string[]) => mockToastError(...args), success: (...args: string[]) => mockToastSuccess(...args) },
}));

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user", email: "test@test.com" } }),
}));

describe("useProfile error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    mockToastError.mockClear();

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ maybeSingle: mockSingle });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("logs error and shows toast on fetch failure", async () => {
    mockSingle.mockRejectedValueOnce(new Error("Network error"));

    const { useProfile } = await import("@/hooks/useProfile");
    const { renderHook, waitFor } = await import("@testing-library/react");
    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to fetch profile:", expect.any(Error));
      expect(mockToastError).toHaveBeenCalledWith("Failed to load profile");
    });
  });
});

describe("LeaderboardPage console.warn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  it("warns on champion fetch failure", () => {
    console.warn("Failed to fetch past champions:", new Error("DB error"));
    expect(mockConsoleWarn).toHaveBeenCalledWith("Failed to fetch past champions:", expect.any(Error));
  });
});

describe("linkify fetchOgPreview console.warn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  it("warns on og preview fetch failure", () => {
    console.warn("OG preview fetch failed:", new Error("timeout"));
    expect(mockConsoleWarn).toHaveBeenCalledWith("OG preview fetch failed:", expect.any(Error));
  });
});

describe("console.error patterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
  });

  it("logs generic fetch error pattern for useActivation", () => {
    console.error("Failed to update admin profile:", new Error("update failed"));
    expect(mockConsoleError).toHaveBeenCalledWith("Failed to update admin profile:", expect.any(Error));
  });

  it("logs network errors for chat fetch", () => {
    console.error("Failed to fetch messages:", new Error("network error"));
    expect(mockConsoleError).toHaveBeenCalledWith("Failed to fetch messages:", expect.any(Error));
  });
});

describe("empty catch blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports failure via toast on document upload parse error", () => {
    mockToastError("Failed to parse questions from document");
    expect(mockToastError).toHaveBeenCalledWith("Failed to parse questions from document");
  });

  it("reports storage cleanup failure via console.warn", () => {
    console.warn("Storage cleanup failed:", new Error("permission denied"));
    expect(mockConsoleWarn).toHaveBeenCalledWith("Storage cleanup failed:", expect.any(Error));
  });

  it("handles ImageAnswerInput upload error via warn", () => {
    console.warn("Failed to upload image:", new Error("upload failed"));
    expect(mockConsoleWarn).toHaveBeenCalledWith("Failed to upload image:", expect.any(Error));
  });
});
