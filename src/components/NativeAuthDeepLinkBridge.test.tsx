import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
  browserClose: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  setSession: vi.fn(),
  navigate: vi.fn(),
  toast: vi.fn(),
  removeListener: vi.fn(),
}));

let onAppUrlOpen: ((event: { url: string }) => void) | undefined;

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
  Capacitor: { getPlatform: () => "ios" },
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
  useToast: () => ({ toast: mocks.toast }),
}));

import { NativeAuthDeepLinkBridge } from "./NativeAuthDeepLinkBridge";

describe("NativeAuthDeepLinkBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAppUrlOpen = undefined;

    mocks.addListener.mockImplementation((_event, callback) => {
      onAppUrlOpen = callback;
      return Promise.resolve({ remove: mocks.removeListener });
    });
    mocks.getLaunchUrl.mockResolvedValue({ url: undefined });
    mocks.browserClose.mockResolvedValue(undefined);
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
    mocks.setSession.mockResolvedValue({ error: null });
  });

  it("shows a helpful message when the provider denies or cancels sign-in", async () => {
    render(<NativeAuthDeepLinkBridge />);
    await waitFor(() => expect(onAppUrlOpen).toBeTypeOf("function"));

    await act(async () => {
      onAppUrlOpen?.({ url: "com.jupeb.master://auth?error=access_denied" });
    });

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Sign-in could not be completed",
        description: "Sign-in was cancelled or not approved. You can try again.",
        variant: "destructive",
      });
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/auth", { replace: true });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges a successful native OAuth code and returns to the app", async () => {
    render(<NativeAuthDeepLinkBridge />);
    await waitFor(() => expect(onAppUrlOpen).toBeTypeOf("function"));

    await act(async () => {
      onAppUrlOpen?.({ url: "com.jupeb.master://auth?code=authorization-code" });
    });

    await waitFor(() => {
      expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("authorization-code");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("surfaces an expired or rejected authorization code instead of failing silently", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "Authorization code expired" },
    });
    render(<NativeAuthDeepLinkBridge />);
    await waitFor(() => expect(onAppUrlOpen).toBeTypeOf("function"));

    await act(async () => {
      onAppUrlOpen?.({ url: "com.jupeb.master://auth?code=expired-code" });
    });

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Sign-in could not be completed",
        description: "Authorization code expired",
        variant: "destructive",
      });
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/auth", { replace: true });
  });

  it("handles a provider error received on a cold launch", async () => {
    mocks.getLaunchUrl.mockResolvedValue({
      url: "com.jupeb.master://auth?error=server_error&error_description=Provider%20unavailable",
    });

    render(<NativeAuthDeepLinkBridge />);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Sign-in could not be completed",
        description: "Provider unavailable",
        variant: "destructive",
      });
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/auth", { replace: true });
  });
});
