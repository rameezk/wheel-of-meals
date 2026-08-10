import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { duplicateMeal } from "../shared/api";
import type { Meal } from "../shared/meal";
import { HouseholdPage } from "./HouseholdPage";
import {
  householdsInMemory,
  type HouseholdsInMemory,
} from "./households-in-memory";
import { mealSuggestions } from "./suggestions";
import { aHousehold, aSlug } from "./test-fixtures";

const aSuggestion = mealSuggestions[0];

const anEmptyHousehold = () => householdsInMemory(aHousehold);

const guide = async (households: HouseholdsInMemory = anEmptyHousehold()) => {
  render(
    <HouseholdPage
      slug={aSlug}
      view="household"
      onGo={() => {}}
      households={households}
    />,
  );
  await screen.findByRole("list", { name: "Suggestions" });
  return households;
};

const tap = (name: string) =>
  userEvent.click(screen.getByRole("button", { name: `Add ${name}` }));

const typeIn = (name: string) =>
  userEvent.type(screen.getByLabelText("Or add your own"), name);

const pressAdd = () =>
  userEvent.click(screen.getByRole("button", { name: /^add$/i }));

const theBank = () => screen.queryByRole("list", { name: "In the Meal Bank" });

const banked = () =>
  within(theBank() ?? document.body)
    .queryAllByRole("listitem")
    .map((row) => row.textContent);

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("the first run", () => {
  it("asks for the Meals the Household cooks often", async () => {
    await guide();

    expect(
      screen.getByRole("heading", { name: /what do you cook often/i }),
    ).toBeInTheDocument();
  });

  it("never asks for a Household name, which waits in the settings", async () => {
    await guide();

    expect(screen.queryByLabelText(/household name/i)).not.toBeInTheDocument();
  });

  it("offers a suggestion for every dish it knows", async () => {
    await guide();

    for (const name of mealSuggestions)
      expect(
        screen.getByRole("button", { name: `Add ${name}` }),
      ).toBeInTheDocument();
  });

  it("pre-fills none of them, so the Bank starts empty", async () => {
    await guide();

    expect(theBank()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Or add your own")).toHaveValue("");
  });

  it("banks a suggestion in a single tap, through the port", async () => {
    const households = anEmptyHousehold();
    const adding = vi.spyOn(households, "addMeal");

    await guide(households);
    await tap(aSuggestion);

    expect(adding).toHaveBeenCalledWith(aSlug, {
      name: aSuggestion,
      description: "",
    });
    expect(screen.getByText(/1 meal in the meal bank/i)).toBeInTheDocument();
  });

  it("stops offering a suggestion once it has been banked", async () => {
    await guide();
    await tap(aSuggestion);

    expect(
      screen.queryByRole("button", { name: `Add ${aSuggestion}` }),
    ).not.toBeInTheDocument();
  });

  it("offers no suggestion the Bank already holds, whatever its case", async () => {
    await guide();
    await typeIn(aSuggestion.toLowerCase());
    await pressAdd();

    expect(
      screen.queryByRole("button", { name: `Add ${aSuggestion}` }),
    ).not.toBeInTheDocument();
  });

  it("takes a Meal nobody suggested, typed in by hand, through the port", async () => {
    const households = anEmptyHousehold();
    const adding = vi.spyOn(households, "addMeal");

    await guide(households);
    await typeIn("Bunny chow");
    await pressAdd();

    expect(adding).toHaveBeenCalledWith(aSlug, {
      name: "Bunny chow",
      description: "",
    });
    expect(screen.getByText("Bunny chow")).toBeInTheDocument();
  });

  it("empties the field after a typed Meal lands, ready for the next", async () => {
    await guide();
    await typeIn("Bunny chow");
    await pressAdd();

    expect(screen.getByLabelText("Or add your own")).toHaveValue("");
  });

  it("will not send a Meal with no name", async () => {
    const households = anEmptyHousehold();
    const adding = vi.spyOn(households, "addMeal");

    await guide(households);
    await typeIn("   ");
    await pressAdd();

    expect(adding).not.toHaveBeenCalled();
  });

  it("gathers taps and typing into the one Bank, counting as it goes", async () => {
    await guide();
    await tap(aSuggestion);
    await typeIn("Bunny chow");
    await pressAdd();

    expect(banked()).toEqual([aSuggestion, "Bunny chow"]);
    expect(screen.getByText(/2 meals in the meal bank/i)).toBeInTheDocument();
  });

  it("says why a Meal was refused, and keeps what was typed", async () => {
    const households = anEmptyHousehold();
    households.refuseNextChange(duplicateMeal);

    await guide(households);
    await typeIn("Bunny chow");
    await pressAdd();

    expect(screen.getByRole("alert")).toHaveTextContent(duplicateMeal.message);
    expect(screen.getByLabelText("Or add your own")).toHaveValue("Bunny chow");
  });

  it("closes adding off while a Meal is still on its way", async () => {
    const households = anEmptyHousehold();
    let land: (meal: Meal) => void = () => {};
    vi.spyOn(households, "addMeal").mockReturnValue(
      new Promise<Meal>((resolve) => {
        land = resolve;
      }),
    );

    await guide(households);
    await typeIn("Bunny chow");
    await tap(aSuggestion);

    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: `Add ${aSuggestion}` }),
    ).toBeDisabled();

    land({ id: "meal-1", name: aSuggestion, description: null, recipe: null });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^add$/i })).toBeEnabled(),
    );
  });

  it("holds the Spin back until the Bank has something to draw from", async () => {
    await guide();

    expect(
      screen.getByRole("button", { name: /spin the week/i }),
    ).toBeDisabled();
  });

  it("opens the Spin up once a Meal is in", async () => {
    await guide();
    await tap(aSuggestion);

    expect(
      screen.getByRole("button", { name: /spin the week/i }),
    ).toBeEnabled();
  });

  it("can be skipped, leaving the Bank empty and the Week unspun", async () => {
    await guide();
    await userEvent.click(
      screen.getByRole("button", { name: /skip for now/i }),
    );

    expect(theBank()).not.toBeInTheDocument();
    expect(screen.getByText(/add a meal to the meal bank/i)).toBeVisible();
  });
});
