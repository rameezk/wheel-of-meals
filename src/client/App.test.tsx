import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { householdsInMemory } from "./households-in-memory";
import { remembered } from "./remembered";
import { aHousehold, aSlug, aStockedHousehold } from "./test-fixtures";

const visit = (path: string) => window.history.pushState({}, "", path);

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  visit("/");
});

describe("the app", () => {
  it("offers the create button at the root", () => {
    visit("/");

    render(<App households={householdsInMemory()} />);

    expect(
      screen.getByRole("button", { name: /create a household/i }),
    ).toBeInTheDocument();
  });

  it("opens the Household a Slug URL points at", async () => {
    visit(`/${aSlug}`);
    render(<App households={householdsInMemory(aHousehold)} />);

    expect(await screen.findByText(aSlug)).toBeInTheDocument();
  });

  it("opens the settings at the settings URL", async () => {
    visit(`/${aSlug}/settings`);
    render(<App households={householdsInMemory(aHousehold)} />);

    expect(await screen.findByLabelText(/name/i)).toBeInTheDocument();
  });

  it("opens the Meal Bank at its own URL", async () => {
    visit(`/${aSlug}/meal-bank`);
    render(<App households={householdsInMemory(aHousehold)} />);

    expect(await screen.findByLabelText("Filter")).toBeInTheDocument();
  });

  it("gives the Meal Bank its own place in the history", async () => {
    visit(`/${aSlug}`);
    render(<App households={householdsInMemory(aStockedHousehold)} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /meal bank/i }),
    );
    expect(window.location.pathname).toBe(`/${aSlug}/meal-bank`);

    window.history.back();

    expect(
      await screen.findByRole("button", { name: /meal bank/i }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/${aSlug}`);
  });

  it("gives the settings their own place in the history", async () => {
    visit(`/${aSlug}`);
    render(<App households={householdsInMemory(aStockedHousehold)} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /settings/i }),
    );
    expect(window.location.pathname).toBe(`/${aSlug}/settings`);

    window.history.back();

    expect(
      await screen.findByRole("button", { name: /meal bank/i }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/${aSlug}`);
  });

  it("shows what the settings changed on the way back to the Household", async () => {
    visit(`/${aSlug}/settings`);
    render(<App households={householdsInMemory(aStockedHousehold)} />);

    await userEvent.type(await screen.findByLabelText(/name/i), "The Khans");
    await userEvent.click(screen.getByRole("checkbox", { name: "Sunday" }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      /not cooking/i,
    );
  });

  it("opens the Household whose Slug was typed in, and remembers it", async () => {
    visit("/");
    render(<App households={householdsInMemory(aStockedHousehold)} />);

    await userEvent.type(
      screen.getByLabelText(/four words/i),
      aSlug.replaceAll("-", " "),
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(
      await screen.findByRole("button", { name: /meal bank/i }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/${aSlug}`);
    await vi.waitFor(() =>
      expect(remembered()).toEqual({ slug: aSlug, name: null }),
    );
  });

  it("falls back to the start for a path that is not a Slug", () => {
    visit("/nonsense");

    render(<App households={householdsInMemory()} />);

    expect(
      screen.getByRole("button", { name: /create a household/i }),
    ).toBeInTheDocument();
  });
});
