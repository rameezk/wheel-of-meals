import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseholdPage } from "./HouseholdPage";
import { aHousehold, aSlug, answerInTurn, answerWith } from "./test-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a Household page", () => {
  it("asks the API for the Household its Slug opens", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} />);

    await screen.findByText(aSlug);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/households/${aSlug}`,
      expect.anything(),
    );
  });

  it("shows the whole week, marking the days it does not cook", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} />);

    expect(await screen.findByText("Sunday")).toBeInTheDocument();
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
    for (const day of ["Friday", "Saturday"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
      expect(screen.getByText(day).closest("li")).toHaveTextContent(
        /not cooking/i,
      );
    }
  });

  it("calls the Household by its name once it has one", async () => {
    answerWith({ ...aHousehold, name: "The Khans" });

    render(<HouseholdPage slug={aSlug} />);

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText(aSlug)).toBeInTheDocument();
  });

  it("falls back to the Slug while the Household is unnamed", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} />);

    expect(
      await screen.findByRole("heading", { name: aSlug }),
    ).toBeInTheDocument();
  });

  it("opens the settings, and shows what they changed on the way back", async () => {
    answerInTurn(
      { body: aHousehold },
      { body: { ...aHousehold, name: "The Khans", cookingDays: ["friday"] } },
    );

    render(<HouseholdPage slug={aSlug} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /settings/i }),
    );
    await userEvent.type(screen.getByLabelText(/name/i), "The Khans");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      /not cooking/i,
    );
  });

  it("says the Meal Bank is empty when it holds nothing", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} />);

    expect(await screen.findByText(/no meals yet/i)).toBeInTheDocument();
  });

  it("says plainly when the link opens nothing", async () => {
    answerWith({ error: "not_found", message: "nope" }, 404);

    render(<HouseholdPage slug={aSlug} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /opens nothing/i,
    );
  });

  it("says so when the lookup fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<HouseholdPage slug={aSlug} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
