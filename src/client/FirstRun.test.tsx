import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { duplicateMeal } from "../shared/api";
import type { Meal } from "../shared/meal";
import { FirstRun } from "./FirstRun";
import { mealSuggestions } from "./suggestions";
import { aSlug, answerInTurn, answerWith } from "./test-fixtures";

const aSuggestion = mealSuggestions[0];

const Guiding = ({
  held = [],
  onSpin = () => {},
  onSkip = () => {},
}: {
  held?: Meal[];
  onSpin?: () => void;
  onSkip?: () => void;
}) => {
  const [meals, setMeals] = useState(held);
  return (
    <FirstRun
      slug={aSlug}
      meals={meals}
      onChange={setMeals}
      onSpin={onSpin}
      onSkip={onSkip}
    />
  );
};

const landed = (name: string): Meal => ({
  id: `meal-${name}`,
  name,
  description: null,
});

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
});

describe("the first run", () => {
  it("asks for the Meals the Household cooks often", () => {
    render(<Guiding />);

    expect(
      screen.getByRole("heading", { name: /what do you cook often/i }),
    ).toBeInTheDocument();
  });

  it("never asks for a Household name, which waits in the settings", () => {
    render(<Guiding />);

    expect(screen.queryByLabelText(/household name/i)).not.toBeInTheDocument();
  });

  it("offers a suggestion for every dish it knows", () => {
    render(<Guiding />);

    for (const name of mealSuggestions)
      expect(
        screen.getByRole("button", { name: `Add ${name}` }),
      ).toBeInTheDocument();
  });

  it("pre-fills none of them, so the Bank starts empty", () => {
    render(<Guiding />);

    expect(theBank()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Or add your own")).toHaveValue("");
  });

  it("banks a suggestion in a single tap", async () => {
    answerWith(landed(aSuggestion));

    render(<Guiding />);
    await tap(aSuggestion);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/households/${aSlug}/meals`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: aSuggestion, description: "" }),
      }),
    );
    expect(screen.getByText(/1 meal in the meal bank/i)).toBeInTheDocument();
  });

  it("stops offering a suggestion once it has been banked", async () => {
    answerWith(landed(aSuggestion));

    render(<Guiding />);
    await tap(aSuggestion);

    expect(
      screen.queryByRole("button", { name: `Add ${aSuggestion}` }),
    ).not.toBeInTheDocument();
  });

  it("offers no suggestion the Household already holds", () => {
    render(<Guiding held={[landed(aSuggestion.toUpperCase())]} />);

    expect(
      screen.queryByRole("button", { name: `Add ${aSuggestion}` }),
    ).not.toBeInTheDocument();
  });

  it("takes a Meal nobody suggested, typed in by hand", async () => {
    answerWith(landed("Bunny chow"));

    render(<Guiding />);
    await typeIn("Bunny chow");
    await pressAdd();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/households/${aSlug}/meals`,
      expect.objectContaining({
        body: JSON.stringify({ name: "Bunny chow", description: "" }),
      }),
    );
    expect(screen.getByText("Bunny chow")).toBeInTheDocument();
  });

  it("empties the field after a typed Meal lands, ready for the next", async () => {
    answerWith(landed("Bunny chow"));

    render(<Guiding />);
    await typeIn("Bunny chow");
    await pressAdd();

    expect(screen.getByLabelText("Or add your own")).toHaveValue("");
  });

  it("will not send a Meal with no name", async () => {
    const fetching = answerWith(landed("Bunny chow"));

    render(<Guiding />);
    await typeIn("   ");
    await pressAdd();

    expect(fetching).not.toHaveBeenCalled();
  });

  it("gathers taps and typing into the one Bank", async () => {
    answerInTurn({ body: landed(aSuggestion) }, { body: landed("Bunny chow") });

    render(<Guiding />);
    await tap(aSuggestion);
    await typeIn("Bunny chow");
    await pressAdd();

    expect(banked()).toEqual([aSuggestion, "Bunny chow"]);
  });

  it("says why a Meal was refused, and keeps what was typed", async () => {
    answerWith(duplicateMeal, 409);

    render(<Guiding />);
    await typeIn("Bunny chow");
    await pressAdd();

    expect(screen.getByRole("alert")).toHaveTextContent(duplicateMeal.message);
    expect(screen.getByLabelText("Or add your own")).toHaveValue("Bunny chow");
  });

  it("holds the Spin back until the Bank has something to draw from", () => {
    render(<Guiding />);

    expect(
      screen.getByRole("button", { name: /spin the week/i }),
    ).toBeDisabled();
  });

  it("goes straight into a Spin once a Meal is in", async () => {
    const spin = vi.fn();
    answerWith(landed(aSuggestion));

    render(<Guiding onSpin={spin} />);
    await tap(aSuggestion);
    await userEvent.click(
      screen.getByRole("button", { name: /spin the week/i }),
    );

    expect(spin).toHaveBeenCalled();
  });

  it("can be skipped, with an empty Bank and no Spin", async () => {
    const skip = vi.fn();
    const spin = vi.fn();

    render(<Guiding onSpin={spin} onSkip={skip} />);
    await userEvent.click(
      screen.getByRole("button", { name: /skip for now/i }),
    );

    expect(skip).toHaveBeenCalled();
    expect(spin).not.toHaveBeenCalled();
  });
});
