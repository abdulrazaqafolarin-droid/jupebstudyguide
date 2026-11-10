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
        "Account activated with the premium plan.",
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
        trial_expires_at: trialExpiry,
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
