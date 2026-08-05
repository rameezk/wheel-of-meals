import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { dayLabels } from "./days";
import { flipStaggerMillis, wheelSpinMillis } from "./motion";
import { withAShareSheet, withNoSharing } from "./test-fixtures";
import { TheWeek } from "./Week";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  withNoSharing();
});

const cookingDays: CookingDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

const aBankOf = (...names: string[]): Meal[] =>
  names.map((name) => ({ id: `meal-${name}`, name, description: null }));

const fiveMeals = aBankOf(
  "Butter chicken",
  "Lasagne",
  "Bobotie",
  "Pad thai",
  "Shakshuka",
);

const sixMeals = [...fiveMeals, ...aBankOf("Ramen")];

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

describe("sharing the Week", () => {
  const theShare = () => screen.queryByRole("button", { name: /share/i });

  const shareIt = () =>
    act(async () => {
      click(theShare()!);
      await Promise.resolve();
    });

  it("offers nothing to share until the Week has been spun", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    expect(theShare()).toBeNull();
  });

  it("holds the share back while the wheel is still turning", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();
    click(theSpin());

    expect(theShare()).toBeNull();
  });

  it("shares the Week as plain text, a labelled line to a Cooking Day", async () => {
    const shared = withAShareSheet();
    render(<TheWeek cookingDays={["sunday"]} mealBank={aBankOf("Lasagne")} />);

    spinIt();
    await shareIt();

    expect(shared).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Sunday: Lasagne" }),
    );
  });

  it("gives an empty day of a thin Week a line of its own", async () => {
    const shared = withAShareSheet();
    render(
      <TheWeek
        cookingDays={["sunday", "monday"]}
        mealBank={aBankOf("Lasagne")}
      />,
    );

    spinIt();
    await shareIt();

    expect(shared).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Sunday: Lasagne\nMonday: -" }),
    );
  });

  it("confirms visibly, so nobody pastes an empty clipboard", async () => {
    withAShareSheet();
    render(<TheWeek cookingDays={["sunday"]} mealBank={aBankOf("Lasagne")} />);

    spinIt();
    await shareIt();

    expect(screen.getByText(/shared/i)).toBeInTheDocument();
  });

  it("drops a stale confirmation when the Week is spun again", async () => {
    withAShareSheet();
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    render(
      <TheWeek
        cookingDays={["sunday"]}
        mealBank={aBankOf("Butter chicken", "Lasagne")}
      />,
    );

    spinIt();
    await shareIt();
    expect(screen.getByText(/shared/i)).toBeInTheDocument();

    spinIt();

    expect(screen.queryByText(/shared/i)).toBeNull();
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
});

const respinFor = (day: string) =>
  within(cardFor(day)).getByRole("button", { name: /re-spin/i });

describe("a re-spin", () => {
  it("offers no re-spin until the Week has been spun", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    expect(screen.queryByRole("button", { name: /re-spin/i })).toBeNull();
  });

  it("offers one on each Cooking Day, and none on the days off", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
      expect(respinFor(day)).toBeInTheDocument();

    for (const day of ["Friday", "Saturday"])
      expect(
        within(cardFor(day)).queryByRole("button", { name: /re-spin/i }),
      ).toBeNull();
  });

  it("swaps in a spare Meal and leaves the other days alone", () => {
    const others = ["Sunday", "Monday", "Wednesday", "Thursday"];
    render(<TheWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    const before = others.map((day) => cardFor(day).textContent);
    const swappedOut = cardFor("Tuesday").textContent;

    click(respinFor("Tuesday"));

    expect(cardFor("Tuesday").textContent).not.toBe(swappedOut);
    expect(others.map((day) => cardFor(day).textContent)).toEqual(before);
  });

  it("never puts a Meal the Week already holds on the re-spun day", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    click(respinFor("Tuesday"));

    const drawn = cookingDays.map((day) => cardFor(dayLabels[day]).textContent);
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it("disables the control when the Meal Bank offers no alternative", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
      expect(respinFor(day)).toBeDisabled();
  });

  it("disables the control on an empty day of a thin Week", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={aBankOf("Lasagne")} />);

    spinIt();

    expect(respinFor("Thursday")).toBeDisabled();
    expect(cardFor("Thursday")).toHaveTextContent(/no meal/i);
  });

  it("says why, rather than leaving a dead control unexplained", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    const why = screen.getByText(/every meal is already in the week/i);
    expect(why).toBeInTheDocument();
    expect(respinFor("Tuesday")).toHaveAccessibleDescription(why.textContent);
  });

  it("leaves a thin Week its one explanation, not two", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={aBankOf("Lasagne")} />);

    spinIt();

    expect(
      screen.getByText(/ran out before the week did/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/every meal is already in the week/i)).toBeNull();
  });

  it("keeps quiet about spare Meals while the Bank has some", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();

    expect(screen.queryByText(/every meal is already in the week/i)).toBeNull();
    expect(respinFor("Tuesday")).toBeEnabled();
  });

  it("says the re-spun day out loud, and not the four that did not change", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    expect(screen.getByRole("status")).toHaveTextContent(/Sunday: .*Thursday:/);

    click(respinFor("Tuesday"));

    const said = screen.getByRole("status").textContent;
    expect(said).toMatch(/^Tuesday: /);
    for (const day of ["Sunday", "Monday", "Wednesday", "Thursday"])
      expect(said).not.toContain(day);
  });

  it("flips only the re-spun card, without waiting its turn in the stagger", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    const monday = cardFor("Monday");
    const tuesday = cardFor("Tuesday");

    click(respinFor("Tuesday"));

    expect(cardFor("Monday")).toBe(monday);
    expect(cardFor("Tuesday")).not.toBe(tuesday);
    expect(cardFor("Tuesday")).toHaveClass("card-flip");
    expect(cardFor("Tuesday")).toHaveStyle({ animationDelay: "0ms" });
  });

  it("turns no wheel", () => {
    render(<TheWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    click(respinFor("Tuesday"));

    expect(theWheel()).toBeNull();
  });
});
