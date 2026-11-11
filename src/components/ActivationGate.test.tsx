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

describe("ActivationGate subscription banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateCode.mockResolvedValue({ success: true, plan_type: "monthly", duration_days: 30 });
    mocks.refreshStatus.mockResolvedValue(undefined);
    mocks.useAuth.mockReturnValue({
      user: { id: "trial-user", email: "student@example.com" },
      signOut: vi.fn(),
    });
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: false,
        is_admin: false,
        trial_expires_at: null,
        subscription_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        subscription_duration_days: 7,
        checking: false,
      },
      validateCode: mocks.validateCode,
      validating: false,
      error: null,
      refreshStatus: mocks.refreshStatus,
    });
  });

  it("shows the subscription status and countdown while access is active", () => {
    render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    expect(screen.getByText("7-day subscription active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Time" })).toBeVisible();
    expect(screen.getByText("Protected study content")).toBeInTheDocument();
  });

  it("shows a live subscription countdown that updates every second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T12:00:00.000Z"));
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: false,
        is_admin: false,
        trial_expires_at: null,
        subscription_expires_at: new Date(Date.now() + 60_000).toISOString(),
        subscription_duration_days: 7,
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

  it("opens the inline renewal form without interrupting the subscription", () => {
    render(
      <ActivationGate>
        <div>Protected study content</div>
      </ActivationGate>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Time" }));

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
        "Subscription extended by 30 days.",
      );
    });
  });
  it("reclaims the subscription banner space when the term no longer applies", async () => {
    const subscriptionExpiry = new Date(Date.now() + 60_000).toISOString();
    mocks.useActivation.mockReturnValue({
      status: {
        is_activated: false,
        is_admin: false,
        trial_expires_at: null,
        subscription_expires_at: subscriptionExpiry,
        subscription_duration_days: 7,
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

    expect(screen.getByRole("group", { name: "Subscription status" })).toBeInTheDocument();

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
      expect(screen.queryByRole("group", { name: "Subscription status" })).not.toBeInTheDocument();
    });
  });

});
