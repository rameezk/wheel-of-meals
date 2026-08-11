import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsIcon, ShareIcon } from "./Icons";

const drawings = [
  { name: "the share Icon", Icon: ShareIcon },
  { name: "the settings Icon", Icon: SettingsIcon },
];

describe.each(drawings)("$name", ({ Icon }) => {
  const draw = () => render(<Icon />).container.querySelector("svg")!;

  it("is a 24-unit square, so the whole set is drawn to one grid", () => {
    expect(draw()).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("takes its colour from the text it sits with", () => {
    const svg = draw();
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("fill", "none");
  });

  it("is stroked in the house weight with round caps and joins", () => {
    const svg = draw();
    expect(svg).toHaveAttribute("stroke-width", "1.5");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg).toHaveAttribute("stroke-linejoin", "round");
  });

  it("is sized in ems, so it tracks the text beside it", () => {
    expect(draw().getAttribute("class")).toMatch(/\[1em\]/);
  });

  it("is hidden from assistive technology, leaving the label to name the control", () => {
    expect(draw()).toHaveAttribute("aria-hidden", "true");
  });

  it("draws something rather than an empty square", () => {
    expect(draw().childElementCount).toBeGreaterThan(0);
  });
});
