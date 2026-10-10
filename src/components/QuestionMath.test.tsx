import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionMath } from "./QuestionMath";

function text(content: string): string {
  const { container } = render(<QuestionMath content={content} />);
  // KaTeX embeds the raw TeX source in <annotation> tags for assistive tech
  // (invisible on screen) — strip them so assertions check visible text.
  container.querySelectorAll("annotation").forEach((a) => a.remove());
  return container.textContent || "";
}

describe("QuestionMath with real question-bank content", () => {
  it("renders the bleach question without raw LaTeX", () => {
    const t = text(
      "Household bleach contains ${NaClO}$ as its active ingredient: " +
        "${NaClO(aq) + H_2O_2(l) -> NaCl(aq) + O_2(g) + H_2O(l)}$ " +
        "When $25.0\\,cm^{3}$ of bleach is treated with excess $\\ce{H_2O_2(aq)}$, " +
        "$0.0350$ mole of $\\ce{O_2}$ is given off."
    );
    expect(t).toContain("Household bleach");
    expect(t).not.toContain("$");
    expect(t).not.toContain("\\ce");
    expect(t).not.toContain("->");
    expect(t).not.toContain("\\");
  });

  it("collapses over-escaped backslashes (stored \\\\times)", () => {
    const t = text("$8.75 \\\\times 10^{-4}$");
    expect(t).toContain("8.75");
    expect(t).not.toContain("times");
    expect(t).not.toContain("\\");
    expect(t).not.toContain("$");
  });

  it("renders \\text and \\Omega correctly", () => {
    const t = text("resistance of $0.01\\text{ }\\Omega$?");
    expect(t).toContain("0.01");
    expect(t).toContain("Ω");
    expect(t).not.toContain("\\");
  });

  it("renders bare x^2 scripts without dollars", () => {
    const { container } = render(<QuestionMath content="Find x^2 + y^2 = 6" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    container.querySelectorAll("annotation").forEach((a) => a.remove());
    expect(container.textContent).not.toContain("^");
  });

  it("leaves plain prose untouched", () => {
    expect(text("Which of the following statements is FALSE?")).toContain("FALSE?");
  });

  it("converts \\ce formulas to readable chemistry", () => {
    const t = text("contains $\\ce{H2O2(aq)}$ as product");
    expect(t).not.toContain("\\ce");
    expect(t).not.toContain("$");
    expect(t).toContain("H");
    expect(t).toContain("O");
  });

  it("keeps nested fractions intact", () => {
    const t = text("$C = \\frac{0.0350}{25.0/1000} = 1.40\\,mol\\,dm^{-3}$");
    expect(t).toContain("1.40");
    expect(t).not.toContain("$");
    expect(t).not.toContain("frac");
  });

  it("subscripts prose formulas but preserves _italic_", () => {
    const { container } = render(
      <QuestionMath content="vitamin B2 and CO2 are _very_ important" />
    );
    const t = container.textContent || "";
    expect(t).toContain("B₂");
    expect(t).toContain("CO₂");
    expect(container.querySelector("em")).not.toBeNull();
  });

  it("degrades gracefully on invalid LaTeX without throwing", () => {
    const { container } = render(<QuestionMath content="Broken $\\unknowncmd{xyz}$ here" />);
    expect(container.textContent).toContain("Broken");
    expect(container.textContent).toContain("here");
  });

  it("renders option-style config without raw markers", () => {
    const t = text("[Ne] 3s$^{2}$ 3p$^{6}$");
    expect(t).not.toContain("$");
    expect(t).not.toContain("^");
    expect(t).toContain("Ne");
  });

  it("renders list items and bold section heads without crashing", () => {
    const t = text(
      "**(b)** Write equations:\n- (i) Nitration of bromobenzene\n- (ii) Bromination of nitrobenzene"
    );
    expect(t).not.toContain("**");
    expect(t).toContain("Nitration of bromobenzene");
    expect(t).toContain("(b)");
  });
});
