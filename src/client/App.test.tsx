import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { aHousehold, aSlug, answerInTurn, answerWith } from "./test-fixtures";

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

  it("opens the settings at the settings URL", async () => {
    answerWith(aHousehold);

    visit(`/${aSlug}/settings`);
    render(<App />);

    expect(await screen.findByLabelText(/name/i)).toBeInTheDocument();
  });

  it("gives the settings their own place in the history", async () => {
    answerWith(aHousehold);

    visit(`/${aSlug}`);
    render(<App />);

    await userEvent.click(
      await screen.findByRole("button", { name: /settings/i }),
    );
    expect(window.location.pathname).toBe(`/${aSlug}/settings`);

    window.history.back();

    expect(
      await screen.findByRole("heading", { name: "Cooking Days" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/${aSlug}`);
  });

  it("shows what the settings changed on the way back to the Household", async () => {
    answerInTurn(
      { body: aHousehold },
      { body: { ...aHousehold, name: "The Khans", cookingDays: ["friday"] } },
    );

    visit(`/${aSlug}/settings`);
    render(<App />);

    await userEvent.type(await screen.findByLabelText(/name/i), "The Khans");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      /not cooking/i,
    );
  });

  it("falls back to the start for a path that is not a Slug", () => {
    visit("/nonsense");

    render(<App />);

    expect(
      screen.getByRole("button", { name: /create a household/i }),
    ).toBeInTheDocument();
  });
});
