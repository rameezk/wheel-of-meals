import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { TheWeek } from "./Week";

afterEach(() => vi.restoreAllMocks());

const cookingDays: CookingDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

const aBankOf = (...names: string[]): Meal[] =>
  names.map((name, index) => ({
    id: `meal-${index}`,
    name,
    description: null,
  }));

const fiveMeals = aBankOf(
  "Butter chicken",
  "Lasagne",
  "Bobotie",
  "Pad thai",
  "Shakshuka",
);

const theSpin = () => screen.getByRole("button", { name: /spin/i });

describe("the Week", () => {
  it("shows every day, marking the ones the Household does not cook", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
      expect(screen.getByText(day).closest("li")).not.toHaveTextContent(
        /not cooking/i,
      );

    for (const day of ["Friday", "Saturday"])
      expect(screen.getByText(day).closest("li")).toHaveTextContent(
        /not cooking/i,
      );
  });

  it("fills a Meal into every Cooking Day when it is spun", async () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    await userEvent.click(theSpin());

    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("leaves the days a thin Meal Bank cannot fill visibly empty", async () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={aBankOf("Lasagne")} />);

    await userEvent.click(theSpin());

    expect(screen.getByText("Lasagne")).toBeInTheDocument();
    expect(screen.getAllByText(/no meal/i)).toHaveLength(4);
    expect(
      screen.getByText(/ran out before the week did/i),
    ).toBeInTheDocument();
  });

  it("keeps quiet about the Meal Bank running out when it filled the week", async () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    await userEvent.click(theSpin());

    expect(screen.queryByText(/ran out before the week did/i)).toBeNull();
  });

  it("points an empty Meal Bank at adding Meals instead of offering a Spin", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={[]} />);

    expect(screen.queryByRole("button", { name: /spin/i })).toBeNull();
    expect(screen.getByText(/add a meal below/i)).toBeInTheDocument();
  });

  it("replaces the Week when it is spun again", async () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99);

    render(
      <TheWeek
        cookingDays={["sunday"]}
        mealBank={aBankOf("Butter chicken", "Lasagne")}
      />,
    );

    await userEvent.click(theSpin());
    expect(screen.getByText("Butter chicken")).toBeInTheDocument();

    await userEvent.click(theSpin());
    expect(screen.getByText("Lasagne")).toBeInTheDocument();
    expect(screen.queryByText("Butter chicken")).toBeNull();
  });
});
