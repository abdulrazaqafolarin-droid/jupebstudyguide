import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  isAndroidApp: vi.fn(),
  getInstalledVersion: vi.fn(),
  fetchLatestRelease: vi.fn(),
  isNewer: vi.fn((installedCode: number, latestCode: number) => latestCode > installedCode),
  canInstallPackages: vi.fn(),
  openInstallSettings: vi.fn(),
  downloadApk: vi.fn(),
  deleteDownloadedApkFile: vi.fn(),
  installDownloadedApk: vi.fn(),
}));

vi.mock("@/lib/app-updater", () => ({
  isAndroidApp: mocks.isAndroidApp,
  getInstalledVersion: mocks.getInstalledVersion,
  fetchLatestRelease: mocks.fetchLatestRelease,
  isNewer: mocks.isNewer,
  canInstallPackages: mocks.canInstallPackages,
  openInstallSettings: mocks.openInstallSettings,
  downloadApk: mocks.downloadApk,
  deleteDownloadedApkFile: mocks.deleteDownloadedApkFile,
  installDownloadedApk: mocks.installDownloadedApk,
}));

import { AppUpdatePrompt } from "./AppUpdatePrompt";

const release = {
  versionCode: 101,
  versionName: "2.0.10.1",
  commit: "abc123",
  builtAt: "2026-11-26T10:00:00Z",
  url: "https://updates.example.test/rutex-master-next-101.apk",
  sha256: "a".repeat(64),
  requiresReinstall: false,
};

describe("AppUpdatePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    mocks.isAndroidApp.mockReturnValue(true);
    mocks.getInstalledVersion.mockResolvedValue({ versionCode: 100, versionName: "2.0.10.0" });
    mocks.fetchLatestRelease.mockResolvedValue({ ...release });
    mocks.isNewer.mockImplementation((installedCode: number, latestCode: number) => latestCode > installedCode);
    mocks.canInstallPackages.mockResolvedValue(true);
    mocks.openInstallSettings.mockResolvedValue(undefined);
    mocks.downloadApk.mockResolvedValue("/app-cache/rutex-master-next-101.apk");
    mocks.deleteDownloadedApkFile.mockResolvedValue(undefined);
    mocks.installDownloadedApk.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("checks for updates on Android startup and displays an available release", async () => {
    render(<AppUpdatePrompt />);

    expect(await screen.findByText("Update available · v2.0.10.1")).toBeInTheDocument();
    expect(mocks.getInstalledVersion).toHaveBeenCalledTimes(1);
    expect(mocks.fetchLatestRelease).toHaveBeenCalledTimes(1);
  });

  it("does not show APK update prompts in the browser or iOS shell", () => {
    mocks.isAndroidApp.mockReturnValue(false);

    render(<AppUpdatePrompt />);

    expect(screen.queryByText(/Update available/)).not.toBeInTheDocument();
    expect(mocks.fetchLatestRelease).not.toHaveBeenCalled();
  });

  it("downloads and opens the installer after the learner chooses Update", async () => {
    render(<AppUpdatePrompt />);

    fireEvent.click(await screen.findByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mocks.downloadApk).toHaveBeenCalledWith(
        release.url,
        release.versionCode,
        release.sha256,
        expect.any(Function),
      );
      expect(mocks.installDownloadedApk).toHaveBeenCalledWith("/app-cache/rutex-master-next-101.apk");
    });
    expect(await screen.findByText(/Installer opened/)).toBeInTheDocument();
  });

  it("removes the cached APK when the learner dismisses an already-downloaded update", async () => {
    render(<AppUpdatePrompt />);

    fireEvent.click(await screen.findByRole("button", { name: "Update" }));
    expect(await screen.findByText(/Installer opened/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Later" }));

    await waitFor(() => {
      expect(mocks.deleteDownloadedApkFile).toHaveBeenCalledWith("/app-cache/rutex-master-next-101.apk");
    });
    expect(localStorage.getItem("app-update-dismissed:101")).toBe("1");
    expect(screen.queryByText(/Update available/)).not.toBeInTheDocument();
  });

  it("keeps a release requiring reinstall paused instead of attempting an unsafe in-place update", async () => {
    mocks.fetchLatestRelease.mockResolvedValue({ ...release, requiresReinstall: true });

    render(<AppUpdatePrompt />);

    expect(await screen.findByText(/Update paused to protect your study data/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update" })).not.toBeInTheDocument();
    expect(mocks.downloadApk).not.toHaveBeenCalled();
    expect(mocks.installDownloadedApk).not.toHaveBeenCalled();
  });
});
