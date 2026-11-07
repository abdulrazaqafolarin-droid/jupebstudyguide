import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
  browserClose: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  setSession: vi.fn(),
  navigate: vi.fn(),
  toast: vi.fn(),
  appUrlOpenCallback: undefined as ((event: { url: string }) => void) | undefined,
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: mocks.addListener,
    getLaunchUrl: mocks.getLaunchUrl,
  },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: { close: mocks.browserClose },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: mocks.getPlatform },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      verifyOtp: mocks.verifyOtp,
      setSession: mocks.setSession,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: mocks.toast,
}));

import { NativeAuthDeepLinkBridge } from "./NativeAuthDeepLinkBridge";

describe("NativeAuthDeepLinkBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appUrlOpenCallback = undefined;
    mocks.getPlatform.mockReturnValue("ios");
    mocks.addListener.mockImplementation(
      (_event: string, callback: (event: { url: string }) => void) => {
        mocks.appUrlOpenCallback = callback;
        return Promise.resolve({ remove: vi.fn() });
      },
    );
    mocks.getLaunchUrl.mockResolvedValue(null);
    mocks.browserClose.mockResolvedValue(undefined);
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
    mocks.setSession.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges a successful cold-start OAuth code and returns to the app", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth?code=oauth-code",
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.browserClose).toHaveBeenCalled();
  });

  it("shows a non-blocking message when the user cancels provider consent", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth#error=access_denied&error_description=User%20cancelled%20authorization",
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Sign-in cancelled",
        description: "The sign-in request was cancelled. You can try again whenever you're ready.",
        variant: "default",
      });
      expect(mocks.navigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("shows the provider's failure description instead of silently ignoring it", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth?error=server_error&error_code=provider_failed&error_description=Google%20provider%20is%20unavailable",
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Sign-in failed",
        description: "Google provider is unavailable",
        variant: "destructive",
      });
    });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("reports a failed PKCE code exchange and returns to sign-in", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth?code=expired-code",
    });
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: new Error("PKCE verifier not found"),
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Sign-in could not be completed",
        description: "PKCE verifier not found",
        variant: "destructive",
      });
      expect(mocks.navigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
  });

  it("handles warm appUrlOpen callbacks using the same error path", async () => {
    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => expect(mocks.appUrlOpenCallback).toBeTypeOf("function"));

    await act(async () => {
      mocks.appUrlOpenCallback?.({
        url: "com.jupeb.master://auth?error=access_denied",
      });
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sign-in cancelled" }),
    );
  });


  it("verifies a signup email token and returns to the app", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth?token_hash=signup-hash&type=signup",
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.verifyOtp).toHaveBeenCalledWith({
        token_hash: "signup-hash",
        type: "signup",
      });
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("routes a verified password-recovery token to the new-password screen", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth?token_hash=recovery-hash&type=recovery",
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.verifyOtp).toHaveBeenCalledWith({
        token_hash: "recovery-hash",
        type: "recovery",
      });
      expect(mocks.navigate).toHaveBeenCalledWith("/auth?flow=recovery", { replace: true });
    });
  });

  it("restores a legacy token-pair callback without exchanging a PKCE code", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth#access_token=access-token&refresh_token=refresh-token",
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.setSession).toHaveBeenCalledWith({
        access_token: "access-token",
        refresh_token: "refresh-token",
      });
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("does not exchange the same URL twice when cold-start and warm events overlap", async () => {
    const callbackUrl = "com.jupeb.master://auth?code=one-time-code";
    mocks.getLaunchUrl.mockResolvedValue({ url: callbackUrl });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1);
      expect(mocks.appUrlOpenCallback).toBeTypeOf("function");
    });

    await act(async () => {
      mocks.appUrlOpenCallback?.({ url: callbackUrl });
    });

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
});
