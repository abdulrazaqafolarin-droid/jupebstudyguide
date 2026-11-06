import { describe, expect, it } from "vitest";
import { formatTrialCountdown } from "./trial-countdown";

describe("formatTrialCountdown", () => {
  it("shows a 24-hour trial as a day plus a clock", () => {
    expect(formatTrialCountdown(86_400_000)).toBe("1d 00:00:00");
  });

  it("counts down hours, minutes and seconds", () => {
    expect(formatTrialCountdown(86_399_000)).toBe("23:59:59");
    expect(formatTrialCountdown(90_000)).toBe("00:01:30");
  });

  it("never displays negative time and rounds partial seconds up", () => {
    expect(formatTrialCountdown(1)).toBe("00:00:01");
    expect(formatTrialCountdown(0)).toBe("00:00:00");
    expect(formatTrialCountdown(-1000)).toBe("00:00:00");
  });
});
