import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { flipStaggerMillis, wheelSpinMillis } from "./motion";
import { asksForLessMotion } from "./test-setup";
import { TheWeek } from "./Week";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

const theSpin = () => screen.getByRole("button", { name: /^spin/i });
const theWheel = () => screen.queryByRole("button", { name: /skip/i });

const click = (target: HTMLElement) => fireEvent.click(target);

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(wheelSpinMillis);
  });

const spinIt = () => {
  click(theSpin());
  settle();
};

const cardFor = (day: string) => screen.getByText(day).closest("li")!;

describe("the Week", () => {
  it("shows every day, marking the ones the Household does not cook", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
      expect(cardFor(day)).not.toHaveTextContent(/not cooking/i);

    for (const day of ["Friday", "Saturday"])
      expect(cardFor(day)).toHaveTextContent(/not cooking/i);
  });

  it("fills a Meal into every Cooking Day when it is spun", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("leaves the days a thin Meal Bank cannot fill visibly empty", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={aBankOf("Lasagne")} />);

    spinIt();

    expect(screen.getByText("Lasagne")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list")).getAllByText(/no meal/i),
    ).toHaveLength(4);
    expect(
      screen.getByText(/ran out before the week did/i),
    ).toBeInTheDocument();
  });

  it("keeps quiet about the Meal Bank running out when it filled the week", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    expect(screen.queryByText(/ran out before the week did/i)).toBeNull();
  });

  it("points an empty Meal Bank at adding Meals instead of offering a Spin", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={[]} />);

    expect(screen.queryByRole("button", { name: /spin/i })).toBeNull();
    expect(screen.getByText(/add a meal below/i)).toBeInTheDocument();
  });

  it("replaces the Week when it is spun again", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99);

    render(
      <TheWeek
        cookingDays={["sunday"]}
        mealBank={aBankOf("Butter chicken", "Lasagne")}
      />,
    );

    spinIt();
    expect(screen.getByText("Butter chicken")).toBeInTheDocument();

    spinIt();
    expect(screen.getByText("Lasagne")).toBeInTheDocument();
    expect(screen.queryByText("Butter chicken")).toBeNull();
  });
});

describe("the wheel", () => {
  it("spins once, and holds the Week back until it lands", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());

    expect(theWheel()).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("invisible");

    settle();

    expect(theWheel()).toBeNull();
    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("skips straight to the result when it is tapped", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());
    click(theWheel()!);

    expect(theWheel()).toBeNull();
    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("lands rather than spinning again when the button is pressed twice", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());
    click(theSpin());

    expect(theWheel()).toBeNull();
    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("says the Week out loud once the wheel lands", () => {
    render(<TheWeek cookingDays={["sunday"]} mealBank={aBankOf("Lasagne")} />);

    click(theSpin());
    expect(screen.getByRole("status")).toHaveTextContent(/spinning the week/i);

    settle();

    expect(screen.getByRole("status")).toHaveTextContent("Sunday: Lasagne");
  });

  it("does not turn at all when the device asks for less motion", () => {
    asksForLessMotion(true);
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());

    expect(theWheel()).toBeNull();
    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });
});

describe("the reveal", () => {
  it("flips the day cards in one after another once the wheel lands", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    const cards = ["Sunday", "Monday", "Tuesday"].map(cardFor);

    for (const [position, card] of cards.entries()) {
      expect(card).toHaveClass("card-flip");
      expect(card).toHaveStyle({
        animationDelay: `${position * flipStaggerMillis}ms`,
      });
    }
  });

  it("flips the cards again on the next Spin", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();
    const first = cardFor("Sunday");

    spinIt();

    expect(cardFor("Sunday")).not.toBe(first);
  });

  it("leaves the days still when the device asks for less motion", () => {
    asksForLessMotion(true);
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());

    expect(cardFor("Sunday")).not.toHaveClass("card-flip");
  });
});
