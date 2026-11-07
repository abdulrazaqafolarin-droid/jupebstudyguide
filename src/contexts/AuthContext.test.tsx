import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  browserOpen: vi.fn(),
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
    realtime: {
      setAuth: vi.fn(),
    },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mocks.supabase,
}));

vi.mock("@capacitor/browser", () => ({
  Browser: {
    open: mocks.browserOpen,
    close: vi.fn(),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: mocks.getPlatform,
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";

describe("Google OAuth platform handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatform.mockReturnValue("ios");
    mocks.browserOpen.mockResolvedValue(undefined);
    mocks.supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    mocks.supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the Supabase authorization URL in the native iOS browser and uses the app callback", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signInWithGoogle();
    });

    expect(outcome?.error).toBeNull();
    expect(mocks.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "com.jupeb.master://auth",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    expect(mocks.browserOpen).toHaveBeenCalledWith({
      url: "https://project.supabase.co/auth/v1/authorize?provider=google",
    });
  });

  it("starts Apple OAuth using the native iOS callback and opens the system browser", async () => {
    mocks.supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: "https://project.supabase.co/auth/v1/authorize?provider=apple" },
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signInWithApple();
    });
    expect(outcome?.error).toBeNull();
    expect(mocks.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: {
        redirectTo: "com.jupeb.master://auth",
        skipBrowserRedirect: true,
      },
    });
    expect(mocks.browserOpen).toHaveBeenCalledWith({
      url: "https://project.supabase.co/auth/v1/authorize?provider=apple",
    });
  });

  it("uses the standard web redirect for Apple OAuth without opening a native browser", async () => {
    mocks.getPlatform.mockReturnValue("web");
    mocks.supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: "https://project.supabase.co/auth/v1/authorize?provider=apple" },
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signInWithApple();
    });

    expect(outcome?.error).toBeNull();
    expect(mocks.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      },
    });
    expect(mocks.browserOpen).not.toHaveBeenCalled();
  });

  it("keeps the standard browser OAuth redirect for web users", async () => {
    mocks.getPlatform.mockReturnValue("web");
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signInWithGoogle();
    });

    expect(outcome?.error).toBeNull();
    expect(mocks.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
        queryParams: { prompt: "select_account" },
      },
    });
    expect(mocks.browserOpen).not.toHaveBeenCalled();
  });

  it("returns a useful error when the provider does not return an authorization URL", async () => {
    mocks.supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signInWithGoogle();
    });

    expect(outcome?.error).toBeInstanceOf(Error);
    expect(outcome?.error?.message).toContain("did not return an authorization URL");
    expect(mocks.browserOpen).not.toHaveBeenCalled();
  });

  it("surfaces provider errors without opening a browser", async () => {
    mocks.supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: new Error("Google provider is not enabled"),
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let outcome: { error: Error | null } | undefined;
    await act(async () => {
      outcome = await result.current.signInWithGoogle();
    });

    expect(outcome?.error?.message).toBe("Google provider is not enabled");
    expect(mocks.browserOpen).not.toHaveBeenCalled();
  });
});
