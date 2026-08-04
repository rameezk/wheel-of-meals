import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseholdPage } from "./HouseholdPage";
import { aHousehold, aSlug, answerWith } from "./test-fixtures";

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

  it("shows the Cooking Days it was created with, and no others", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} />);

    for (const day of [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
    ]) {
      expect(await screen.findByText(day)).toBeInTheDocument();
    }
    expect(screen.queryByText("Friday")).not.toBeInTheDocument();
    expect(screen.queryByText("Saturday")).not.toBeInTheDocument();
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
