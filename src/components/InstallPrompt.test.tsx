import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Capacitor } from "@capacitor/core";
import InstallPrompt from "./InstallPrompt";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("InstallPrompt platform behavior", () => {
  it("never shows browser installation instructions inside a native app", async () => {
    vi.useFakeTimers();
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);

    render(<InstallPrompt />);

    const browserInstallEvent = new Event("beforeinstallprompt", { cancelable: true });
    window.dispatchEvent(browserInstallEvent);
    await vi.advanceTimersByTimeAsync(6_000);

    expect(screen.queryByText("Install App")).not.toBeInTheDocument();
    expect(screen.queryByText(/Add to Home Screen/i)).not.toBeInTheDocument();
  });

  it("keeps the browser install prompt available to web/PWA users", async () => {
    vi.useFakeTimers();
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);

    render(<InstallPrompt />);

    const browserInstallEvent = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "dismissed" as const }),
      },
    );
    fireEvent(window, browserInstallEvent);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(screen.getByText("Install App")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Install Now/i })).toBeInTheDocument();
  });
});
