import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  useActivation: vi.fn(),
  useAuth: vi.fn(),
  validateCode: vi.fn(),
  refreshStatus: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/hooks/useActivation", () => ({
  useActivation: mocks.useActivation,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: vi.fn(),
  },
}));

import { ActivationGate } from "./ActivationGate";

describe("ActivationGate active-trial banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateCode.mockResolvedValue({ success: true, plan_type: "premium" });
    mocks.refreshStatus.mockResolvedValue(undefined);
    mocks.useAuth.mockReturnValue({
      user: { id: "trial-user", email: "student@example.com" },
      signOut: vi.fn(),
    });
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: false,
        is_admin: false,
        trial_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });
  });

  it("keeps an unexpired subscription open even when the legacy activation flag is set", () => {
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: true,
        is_admin: false,
        trial_expires_at: null,
        subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });

    render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    expect(screen.getByText("Protected study content")).toBeInTheDocument();
  });

  it("does not treat an expired activation flag as a permanent subscription", () => {
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: true,
        is_admin: false,
        trial_expires_at: null,
        subscription_expires_at: new Date(Date.now() - 60_000).toISOString(),
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });

    render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    expect(screen.queryByText("Protected study content")).not.toBeInTheDocument();
    expect(screen.getByText("Activate Your JUPEB Access")).toBeInTheDocument();
  });

  it("uses JAMB-specific entitlement and activation messaging", () => {
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: false,
        is_admin: false,
        trial_expires_at: null,
        subscription_expires_at: null,
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });

    render(
      <ActivationGate programId="jamb">
        <div>JAMB protected content</div>
      </ActivationGate>,
    );

    expect(mocks.useActivation).toHaveBeenCalledWith("jamb");
    expect(screen.getByText("Activate Your JAMB / UTME Access")).toBeInTheDocument();
    expect(screen.queryByText("Activate Your JUPEB Access")).not.toBeInTheDocument();
    expect(screen.getByText(/issued specifically for JAMB \/ UTME/)).toBeInTheDocument();
  });

  it("always displays Activate Now while a one-day trial is active", () => {
    render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    expect(screen.getByText("1-day free trial active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate Now" })).toBeVisible();
    expect(screen.getByText("Protected study content")).toBeInTheDocument();
  });

  it("shows a live hours-minutes-seconds countdown that updates every second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T12:00:00.000Z"));
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: false,
        is_admin: false,
        trial_expires_at: new Date(Date.now() + 60_000).toISOString(),
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });

    try {
      render(
        <ActivationGate>
          <div>Protected study content</div>
        </ActivationGate>,
      );
      expect(screen.getByText("00:01:00 remaining")).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(1000);
      expect(screen.getByText("00:00:59 remaining")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the activation gate and code check scoped to JAMB", () => {
    render(
      <ActivationGate programId="jamb">
        <div>JAMB study content</div>
      </ActivationGate>,
    );

    expect(mocks.useActivation).toHaveBeenCalledWith("jamb");
    expect(screen.getByText("JAMB study content")).toBeInTheDocument();
  });

  it("opens the inline activation form without interrupting the trial session", () => {
    render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Activate Now" }));

    expect(screen.getByLabelText("Enter your activation code")).toBeVisible();
    expect(screen.getByRole("button", { name: "Later" })).toBeVisible();
    expect(screen.getByText("Protected study content")).toBeInTheDocument();
  });

  it("validates a normalized code and refreshes the account after success", async () => {
    render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Activate Now" }));
    fireEvent.change(screen.getByLabelText("Enter your activation code"), {
      target: { value: "abcd-1234-efgh" },
    });
    fireEvent.submit(screen.getByLabelText("Enter your activation code").closest("form")!);

    await waitFor(() => {
      expect(mocks.validateCode).toHaveBeenCalledWith("ABCD-1234-EFGH");
      expect(mocks.refreshStatus).toHaveBeenCalledOnce();
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "JUPEB activated with the premium plan.",
      );
    });
  });
  it("reclaims the trial banner space while keeping the app surface and content mounted", async () => {
    const trialExpiry = new Date(Date.now() + 60_000).toISOString();
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: false,
        is_admin: false,
        trial_expires_at: trialExpiry,
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });

    const { rerender } = render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    expect(screen.getByRole("group", { name: "Free trial status" })).toBeInTheDocument();

    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: true,
        is_admin: false,
        trial_expires_at: null,
        subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });
    rerender(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    expect(document.querySelector(".activation-gate-shell")).toHaveClass(
      "min-h-[100dvh]",
      "bg-background",
      "w-full",
    );
    expect(document.querySelector(".activation-gate-content")).toHaveClass(
      "min-w-0",
      "w-full",
      "bg-background",
    );
    expect(screen.getByText("Protected study content")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("group", { name: "Free trial status" })).not.toBeInTheDocument();
    });
  });

});
