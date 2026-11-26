import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  isAndroidApp: vi.fn(),
  getInstalledVersion: vi.fn(),
  fetchLatestRelease: vi.fn(),
  isNewer: vi.fn((installedCode: number, latestCode: number) => latestCode > installedCode),
  canInstallPackages: vi.fn(),
  downloadApk: vi.fn(),
  installDownloadedApk: vi.fn(),
  openInstallSettings: vi.fn(),
}));

vi.mock("@/lib/app-updater", () => ({
  isAndroidApp: mocks.isAndroidApp,
  getInstalledVersion: mocks.getInstalledVersion,
  fetchLatestRelease: mocks.fetchLatestRelease,
  isNewer: mocks.isNewer,
  canInstallPackages: mocks.canInstallPackages,
  downloadApk: mocks.downloadApk,
  installDownloadedApk: mocks.installDownloadedApk,
  openInstallSettings: mocks.openInstallSettings,
}));

import { AppUpdatePrompt } from "./AppUpdatePrompt";

const newerRelease = {
  versionCode: 202001,
  versionName: "2.0.20.1",
  commit: "test-new-release",
  builtAt: "2026-11-18T10:00:00Z",
  url: "https://example.supabase.co/app-releases/rutex-master-next/rutex-master-next-202001.apk",
  sha256: "b".repeat(64),
};

describe("AppUpdatePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    mocks.isAndroidApp.mockReturnValue(true);
    mocks.getInstalledVersion.mockResolvedValue({
      versionCode: 201901,
      versionName: "2.0.19.1",
    });
    mocks.fetchLatestRelease.mockResolvedValue(null);
    mocks.isNewer.mockImplementation((installedCode, latestCode) => latestCode > installedCode);
    mocks.canInstallPackages.mockResolvedValue(true);
    mocks.downloadApk.mockResolvedValue("/cache/rutex-master-next-202001.apk");
    mocks.installDownloadedApk.mockResolvedValue(undefined);
    mocks.openInstallSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("does not run the native updater on web or iOS", () => {
    mocks.isAndroidApp.mockReturnValue(false);

    const { container } = render(<AppUpdatePrompt />);

    expect(container.firstChild).toBeNull();
    expect(mocks.getInstalledVersion).not.toHaveBeenCalled();
    expect(mocks.fetchLatestRelease).not.toHaveBeenCalled();
  });

  it("announces a newer release automatically without downloading or installing it", async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);

    render(<AppUpdatePrompt />);

    expect(await screen.findByRole("status")).toHaveTextContent("Update available · v2.0.20.1");
    expect(screen.getByText("A newer version is ready. Your study data stays on your account.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^update$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^later$/i })).toBeInTheDocument();
    expect(mocks.downloadApk).not.toHaveBeenCalled();
    expect(mocks.installDownloadedApk).not.toHaveBeenCalled();
  });

  it("does not show a prompt when the manifest is equal to or older than the installed app", async () => {
    mocks.fetchLatestRelease.mockResolvedValue({
      ...newerRelease,
      versionCode: 201901,
      versionName: "2.0.19.1",
    });

    render(<AppUpdatePrompt />);

    await waitFor(() => expect(mocks.fetchLatestRelease).toHaveBeenCalledOnce());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mocks.downloadApk).not.toHaveBeenCalled();
  });

  it("keeps a Later dismissal for the specific release across remounts", async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);

    const first = render(<AppUpdatePrompt />);
    fireEvent.click(await screen.findByRole("button", { name: /^later$/i }));
    expect(window.localStorage.getItem("app-update-dismissed:202001")).toBe("1");
    first.unmount();

    render(<AppUpdatePrompt />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mocks.fetchLatestRelease).toHaveBeenCalledTimes(2);
    expect(mocks.getInstalledVersion).toHaveBeenCalledTimes(2);
  });

  it("downloads a selected update and opens the Android installer", async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);

    render(<AppUpdatePrompt />);
    fireEvent.click(await screen.findByRole("button", { name: /^update$/i }));

    await waitFor(() => {
      expect(mocks.downloadApk).toHaveBeenCalledWith(
        newerRelease.url,
        newerRelease.versionCode,
        newerRelease.sha256,
        expect.any(Function),
      );
      expect(mocks.installDownloadedApk).toHaveBeenCalledWith(
        "/cache/rutex-master-next-202001.apk",
      );
    });
    expect(await screen.findByText("Installer opened. Confirm the update in Android’s system prompt.")).toBeInTheDocument();
  });

  it("pauses a release requiring an uninstall instead of risking local study data", async () => {
    mocks.fetchLatestRelease.mockResolvedValue({
      ...newerRelease,
      requiresReinstall: true,
    });

    render(<AppUpdatePrompt />);

    expect(await screen.findByRole("status")).toHaveTextContent("Update paused to protect your study data");
    expect(screen.getByText(/would require uninstalling the older app/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^update$/i })).not.toBeInTheDocument();
    expect(mocks.downloadApk).not.toHaveBeenCalled();
    expect(mocks.installDownloadedApk).not.toHaveBeenCalled();
  });

  it("retries the update check when the device comes back online", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);

    render(<AppUpdatePrompt />);
    expect(mocks.fetchLatestRelease).not.toHaveBeenCalled();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    window.dispatchEvent(new Event("online"));

    expect(await screen.findByRole("status")).toHaveTextContent("Update available · v2.0.20.1");
    expect(mocks.fetchLatestRelease).toHaveBeenCalledOnce();
  });

  it("opens Android's install-permission settings before attempting installation", async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);
    mocks.canInstallPackages.mockResolvedValue(false);

    render(<AppUpdatePrompt />);
    fireEvent.click(await screen.findByRole("button", { name: /^update$/i }));

    await waitFor(() => expect(mocks.openInstallSettings).toHaveBeenCalledOnce());
    expect(mocks.downloadApk).toHaveBeenCalledOnce();
    expect(mocks.installDownloadedApk).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Android needs install permission.");
  });
});
