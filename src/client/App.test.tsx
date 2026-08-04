import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { aHousehold, aSlug, answerWith } from "./test-fixtures";

const visit = (path: string) => window.history.pushState({}, "", path);

afterEach(() => {
  vi.restoreAllMocks();
  visit("/");
});

describe("the app", () => {
  it("offers the create button at the root", () => {
    visit("/");

    render(<App />);

    expect(
      screen.getByRole("button", { name: /create a household/i }),
    ).toBeInTheDocument();
  });

  it("opens the Household a Slug URL points at", async () => {
    answerWith(aHousehold);

    visit(`/${aSlug}`);
    render(<App />);

    expect(await screen.findByText(aSlug)).toBeInTheDocument();
  });

  it("falls back to the start for a path that is not a Slug", () => {
    visit("/nonsense");

    render(<App />);

    expect(
      screen.getByRole("button", { name: /create a household/i }),
    ).toBeInTheDocument();
  });
});
