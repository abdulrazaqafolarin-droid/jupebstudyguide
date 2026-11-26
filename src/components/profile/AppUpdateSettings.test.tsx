import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isAndroidApp: vi.fn(),
  getInstalledVersion: vi.fn(),
  fetchLatestRelease: vi.fn(),
  isNewer: vi.fn((installedCode: number, latestCode: number) => latestCode > installedCode),
  canInstallPackages: vi.fn(),
  openInstallSettings: vi.fn(),
  downloadApk: vi.fn(),
  installDownloadedApk: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/lib/app-updater', () => ({
  isAndroidApp: mocks.isAndroidApp,
  getInstalledVersion: mocks.getInstalledVersion,
  fetchLatestRelease: mocks.fetchLatestRelease,
  isNewer: mocks.isNewer,
  canInstallPackages: mocks.canInstallPackages,
  openInstallSettings: mocks.openInstallSettings,
  downloadApk: mocks.downloadApk,
  installDownloadedApk: mocks.installDownloadedApk,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    info: mocks.toastInfo,
  },
}));

import { AppUpdateSettings } from './AppUpdateSettings';

const newerRelease = {
  versionCode: 202001,
  versionName: '2.0.20.1',
  commit: 'test-new-release',
  builtAt: '2026-11-11T00:00:00Z',
  url: 'https://example.supabase.co/app-releases/rutex-master-next/rutex-master-next-202001.apk',
  sha256: 'b'.repeat(64),
};

describe('AppUpdateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAndroidApp.mockReturnValue(true);
    mocks.getInstalledVersion.mockResolvedValue({
      versionCode: 201901,
      versionName: '2.0.19.1',
    });
    mocks.fetchLatestRelease.mockResolvedValue(null);
    mocks.canInstallPackages.mockResolvedValue(true);
    mocks.downloadApk.mockResolvedValue('/cache/rutex-master-next.apk');
    mocks.installDownloadedApk.mockResolvedValue(undefined);
    mocks.openInstallSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('does not show Android APK update controls on the web or iOS shell', () => {
    mocks.isAndroidApp.mockReturnValue(false);

    const { container } = render(<AppUpdateSettings />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: /check for updates/i })).not.toBeInTheDocument();
  });

  it('shows the installed version and Check for Updates control on Android', async () => {
    render(<AppUpdateSettings />);

    expect(await screen.findByText('Installed version 2.0.19.1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check for updates/i })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mocks.getInstalledVersion).toHaveBeenCalledOnce();
    expect(mocks.fetchLatestRelease).toHaveBeenCalledOnce();
  });

  it('announces a newer release on startup with Update now and Later actions', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);

    render(<AppUpdateSettings />);

    expect(await screen.findByRole('status')).toHaveTextContent('A new version is available');
    expect(screen.getByText('Rutex Master Next 2.0.20.1 is ready to update.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /later/i })).toBeInTheDocument();
    expect(mocks.downloadApk).not.toHaveBeenCalled();
    expect(mocks.installDownloadedApk).not.toHaveBeenCalled();
  });

  it('does not announce an equal or older manifest version', async () => {
    mocks.fetchLatestRelease.mockResolvedValue({
      ...newerRelease,
      versionCode: 201800,
      versionName: '2.0.18.0',
      url: 'https://example.supabase.co/app-releases/rutex-master-next/rutex-master-next-201800.apk',
    });

    render(<AppUpdateSettings />);

    expect(await screen.findByText('Installed version 2.0.19.1')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update now/i })).not.toBeInTheDocument();
  });

  it('lets the user postpone the startup notice without hiding update availability', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);

    render(<AppUpdateSettings />);

    fireEvent.click(await screen.findByRole('button', { name: /later/i }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Version 2.0.20.1 is available.')).toBeInTheDocument();
    expect(mocks.downloadApk).not.toHaveBeenCalled();
  });

  it('reports when the installed app is already current', async () => {
    mocks.fetchLatestRelease.mockResolvedValue({
      ...newerRelease,
      versionCode: 201901,
      versionName: '2.0.19.1',
      url: 'https://example.supabase.co/app-releases/rutex-master-next/rutex-master-next-201901.apk',
    });

    render(<AppUpdateSettings />);
    fireEvent.click(await screen.findByRole('button', { name: /check for updates/i }));

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith('You are using the latest version.');
    });
    expect(mocks.downloadApk).not.toHaveBeenCalled();
    expect(mocks.installDownloadedApk).not.toHaveBeenCalled();
  });

  it('downloads and hands a newer verified release to the Android installer', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);

    render(<AppUpdateSettings />);
    fireEvent.click(await screen.findByRole('button', { name: /update now/i }));

    await waitFor(() => {
      expect(mocks.downloadApk).toHaveBeenCalledWith(
        newerRelease.url,
        newerRelease.versionCode,
        newerRelease.sha256,
        expect.any(Function),
      );
      expect(mocks.installDownloadedApk).toHaveBeenCalledWith('/cache/rutex-master-next.apk');
    });
  });

  it('opens Android install permission settings when the app is not allowed to install packages', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(newerRelease);
    mocks.canInstallPackages.mockResolvedValue(false);

    render(<AppUpdateSettings />);
    fireEvent.click(await screen.findByRole('button', { name: /update now/i }));

    await waitFor(() => {
      expect(mocks.openInstallSettings).toHaveBeenCalledOnce();
    });
    expect(mocks.downloadApk).not.toHaveBeenCalled();
  });
});
