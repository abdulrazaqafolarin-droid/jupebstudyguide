import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathRenderer } from "./MathRenderer";

function visibleText(content: string): string {
  const { container } = render(<MathRenderer content={content} />);
  container.querySelectorAll("annotation").forEach((a) => a.remove());
  return container.textContent || "";
}

describe("MathRenderer AI-answer formatting", () => {
  it("renders blockquotes instead of raw >", () => {
    const { container } = render(<MathRenderer content={"> Moles on top, volume drops"} />);
    const t = visibleText("> Moles on top, volume drops");
    expect(t).toContain("Moles on top");
    expect(t).not.toContain(">");
    expect(container.querySelector("blockquote, .border-l-2")).not.toBeNull();
  });

  it("renders --- as a rule, not literal text", () => {
    const { container } = render(<MathRenderer content={"Step one\n---\nStep two"} />);
    expect(container.querySelector("hr")).not.toBeNull();
    expect(visibleText("Step one\n---\nStep two")).not.toContain("---");
  });

  it("bolds across math spans", () => {
    const { container } = render(
      <MathRenderer content="**$n$ on top, and $C$ and $V$**" />
    );
    expect(container.querySelector("strong")).not.toBeNull();
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(3);
    const t = visibleText("**$n$ on top, and $C$ and $V$**");
    expect(t).not.toContain("**");
    expect(t).not.toContain("$");
    expect(t).toContain("on top");
  });

  it("does not corrupt valid nested fractions", () => {
    const { container } = render(
      <MathRenderer content="$C = \\frac{0.0350}{25.0/1000} = 1.40$" />
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    const t = visibleText("$C = \\frac{0.0350}{25.0/1000} = 1.40$");
    expect(t).toContain("1.40");
    expect(t).not.toContain("frac{25");
  });

  it("handles \\ce chemistry without throwing", () => {
    const t = visibleText("Reaction: $\\ce{H2O2(aq)}$ end");
    expect(t).not.toContain("\\ce");
  });

  it("keeps lists, headers and code working", () => {
    const t = visibleText("## Title\n- item one\n`code`");
    expect(t).toContain("Title");
    expect(t).toContain("item one");
    expect(t).toContain("code");
  });
});
