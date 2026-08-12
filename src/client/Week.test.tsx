import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { dayLabels } from "./days";
import { wholeMeal } from "./meals";
import { flipStaggerMillis, wheelSpinMillis } from "./motion";
import type { OpenHousehold } from "./open-household";
import type { Recipe } from "../shared/recipe";
import {
  anOpenHousehold,
  aRecipe,
  withAShareSheet,
  withNoSharing,
} from "./test-fixtures";
import { TheWeek } from "./Week";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
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
  names.map((name) => ({
    id: `meal-${name}`,
    name,
    description: null,
    recipe: null,
  }));

const aBankOfDescribed = (...described: [string, string][]): Meal[] =>
  described.map(([name, description]) => ({
    id: `meal-${name}`,
    name,
    description,
    recipe: null,
  }));

const aBankOfCooked = (...cooked: [string, Partial<Recipe>][]): Meal[] =>
  cooked.map(([name, recipe]) => ({
    id: `meal-${name}`,
    name,
    description: null,
    recipe: aRecipe(recipe),
  }));

type AWeekProps = {
  cookingDays: CookingDay[];
  mealBank: Meal[];
  spinOnArrival?: boolean;
  parts?: Partial<OpenHousehold>;
};

const AWeek = ({ cookingDays, mealBank, spinOnArrival, parts }: AWeekProps) => (
  <TheWeek
    openHousehold={anOpenHousehold({ cookingDays, mealBank }, parts)}
    spinOnArrival={spinOnArrival}
  />
);

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
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
      expect(cardFor(day)).not.toHaveTextContent(/not cooking/i);

    for (const day of ["Friday", "Saturday"])
      expect(cardFor(day)).toHaveTextContent(/not cooking/i);
  });

  it("fills a Meal into every Cooking Day when it is spun", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("leaves the days a thin Meal Bank cannot fill visibly empty", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={aBankOf("Lasagne")} />);

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
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    expect(screen.queryByText(/ran out before the week did/i)).toBeNull();
  });

  it("points an empty Meal Bank at adding Meals instead of offering a Spin", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={[]} />);

    expect(screen.queryByRole("button", { name: /spin/i })).toBeNull();
    expect(
      screen.getByText(/add a meal to the meal bank/i),
    ).toBeInTheDocument();
  });

  it("turns the wheel on arrival when it was sent here to spin", () => {
    render(
      <AWeek cookingDays={cookingDays} mealBank={fiveMeals} spinOnArrival />,
    );

    expect(theWheel()).toBeInTheDocument();

    settle();

    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("waits to be asked when it arrived on its own", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    expect(theWheel()).toBeNull();
  });

  it("turns no wheel on arrival with nothing to draw from", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={[]} spinOnArrival />);

    expect(theWheel()).toBeNull();
    expect(
      screen.getByText(/add a meal to the meal bank/i),
    ).toBeInTheDocument();
  });

  it("replaces the Week when it is spun again", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99);

    render(
      <AWeek
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
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    expect(theShare()).toBeNull();
  });

  it("holds the share back while the wheel is still turning", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();
    click(theSpin());

    expect(theShare()).toBeNull();
  });

  it("shares the Week as plain text, a labelled line to a Cooking Day", async () => {
    const shared = withAShareSheet();
    render(<AWeek cookingDays={["sunday"]} mealBank={aBankOf("Lasagne")} />);

    spinIt();
    await shareIt();

    expect(shared).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Sunday: Lasagne" }),
    );
  });

  it("gives an empty day of a thin Week a line of its own", async () => {
    const shared = withAShareSheet();
    render(
      <AWeek
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
    render(<AWeek cookingDays={["sunday"]} mealBank={aBankOf("Lasagne")} />);

    spinIt();
    await shareIt();

    expect(screen.getByText(/shared/i)).toBeInTheDocument();
  });

  it("drops a stale confirmation when the Week is spun again", async () => {
    withAShareSheet();
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    render(
      <AWeek
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
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());

    expect(theWheel()).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("invisible");

    settle();

    expect(theWheel()).toBeNull();
    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("skips straight to the result when it is tapped", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());
    click(theWheel()!);

    expect(theWheel()).toBeNull();
    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("lands rather than spinning again when the button is pressed twice", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    click(theSpin());
    click(theSpin());

    expect(theWheel()).toBeNull();
    for (const meal of fiveMeals)
      expect(screen.getByText(meal.name)).toBeInTheDocument();
  });

  it("says the Week out loud once the wheel lands", () => {
    render(<AWeek cookingDays={["sunday"]} mealBank={aBankOf("Lasagne")} />);

    click(theSpin());
    expect(screen.getByRole("status")).toHaveTextContent(/spinning the week/i);

    settle();

    expect(screen.getByRole("status")).toHaveTextContent("Sunday: Lasagne");
  });
});

describe("the reveal", () => {
  it("flips the day cards in one after another once the wheel lands", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

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
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

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
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    expect(screen.queryByRole("button", { name: /re-spin/i })).toBeNull();
  });

  it("offers one on each Cooking Day, and none on the days off", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

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
    render(<AWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    const before = others.map((day) => cardFor(day).textContent);
    const swappedOut = cardFor("Tuesday").textContent;

    click(respinFor("Tuesday"));

    expect(cardFor("Tuesday").textContent).not.toBe(swappedOut);
    expect(others.map((day) => cardFor(day).textContent)).toEqual(before);
  });

  it("never puts a Meal the Week already holds on the re-spun day", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    click(respinFor("Tuesday"));

    const drawn = cookingDays.map((day) => cardFor(dayLabels[day]).textContent);
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it("disables the control when the Meal Bank offers no alternative", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
      expect(respinFor(day)).toBeDisabled();
  });

  it("disables the control on an empty day of a thin Week", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={aBankOf("Lasagne")} />);

    spinIt();

    expect(respinFor("Thursday")).toBeDisabled();
    expect(cardFor("Thursday")).toHaveTextContent(/no meal/i);
  });

  it("says why, rather than leaving a dead control unexplained", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={fiveMeals} />);

    spinIt();

    const why = screen.getByText(/every meal is already in the week/i);
    expect(why).toBeInTheDocument();
    expect(respinFor("Tuesday")).toHaveAccessibleDescription(why.textContent);
  });

  it("leaves a thin Week its one explanation, not two", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={aBankOf("Lasagne")} />);

    spinIt();

    expect(
      screen.getByText(/ran out before the week did/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/every meal is already in the week/i)).toBeNull();
  });

  it("keeps quiet about spare Meals while the Bank has some", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();

    expect(screen.queryByText(/every meal is already in the week/i)).toBeNull();
    expect(respinFor("Tuesday")).toBeEnabled();
  });

  it("says the re-spun day out loud, and not the four that did not change", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    expect(screen.getByRole("status")).toHaveTextContent(/Sunday: .*Thursday:/);

    click(respinFor("Tuesday"));

    const said = screen.getByRole("status").textContent;
    expect(said).toMatch(/^Tuesday: /);
    for (const day of ["Sunday", "Monday", "Wednesday", "Thursday"])
      expect(said).not.toContain(day);
  });

  it("flips only the re-spun card, without waiting its turn in the stagger", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={sixMeals} />);

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
    render(<AWeek cookingDays={cookingDays} mealBank={sixMeals} />);

    spinIt();
    click(respinFor("Tuesday"));

    expect(theWheel()).toBeNull();
  });
});

describe("a Meal's description", () => {
  const coconutMilk = "The one with the coconut milk";
  const slowCooker = "Only if the slow cooker is free";
  const chilliOil = "Extra chilli oil, always";

  const describedBank = [
    ...aBankOfDescribed(["Butter chicken", coconutMilk]),
    ...aBankOf("Lasagne"),
    ...aBankOfDescribed(["Bobotie", slowCooker]),
    ...aBankOf("Pad thai", "Shakshuka"),
  ];

  const withASpare = [
    ...describedBank,
    ...aBankOfDescribed(["Ramen", chilliOil]),
  ];

  const justButterChicken = aBankOfDescribed(["Butter chicken", coconutMilk]);

  const openerFor = (day: string) =>
    within(cardFor(day)).queryByRole("button", { name: /description/i });

  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("offers a described Meal's name as something to open", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    spinIt();

    expect(openerFor("Sunday")!).toHaveAccessibleName(
      "Butter chicken, description",
    );
  });

  it("leaves a Meal with no description with nothing to open", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    spinIt();

    expect(cardFor("Monday")).toHaveTextContent("Lasagne");
    expect(openerFor("Monday")).toBeNull();
  });

  it("offers nothing to open before the Week is spun", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    expect(screen.queryByRole("button", { name: /description/i })).toBeNull();
  });

  it("offers nothing to open on an empty day of a thin Week", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={justButterChicken} />);

    spinIt();

    expect(cardFor("Thursday")).toHaveTextContent(/no meal/i);
    expect(openerFor("Thursday")).toBeNull();
  });

  it("offers nothing to open on a day the Household does not cook", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    spinIt();

    expect(openerFor("Friday")).toBeNull();
  });

  it("keeps the description out of the Week until it is asked for", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    spinIt();

    expect(screen.queryByText(coconutMilk)).toBeNull();
    expect(openerFor("Sunday")!).toHaveAttribute("aria-expanded", "false");
  });

  it("reveals the description in full under the name, and hides it again", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    spinIt();
    click(openerFor("Sunday")!);

    expect(
      within(cardFor("Sunday")).getByText(coconutMilk),
    ).toBeInTheDocument();
    expect(openerFor("Sunday")!).toHaveAttribute("aria-expanded", "true");

    click(openerFor("Sunday")!);

    expect(screen.queryByText(coconutMilk)).toBeNull();
    expect(openerFor("Sunday")!).toHaveAttribute("aria-expanded", "false");
  });

  it("holds two days open at once", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    spinIt();
    click(openerFor("Sunday")!);
    click(openerFor("Tuesday")!);

    expect(screen.getByText(coconutMilk)).toBeInTheDocument();
    expect(screen.getByText(slowCooker)).toBeInTheDocument();
  });

  it("closes every open description when the Week is spun again", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={describedBank} />);

    spinIt();
    click(openerFor("Sunday")!);
    click(openerFor("Tuesday")!);

    spinIt();

    expect(screen.queryByText(coconutMilk)).toBeNull();
    expect(screen.queryByText(slowCooker)).toBeNull();
  });

  it("closes the day it re-spins, and leaves the other open days alone", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={withASpare} />);

    spinIt();
    click(openerFor("Sunday")!);
    click(openerFor("Tuesday")!);

    click(respinFor("Tuesday"));

    expect(cardFor("Tuesday")).toHaveTextContent("Ramen");
    expect(screen.queryByText(slowCooker)).toBeNull();
    expect(screen.queryByText(chilliOil)).toBeNull();
    expect(openerFor("Tuesday")!).toHaveAttribute("aria-expanded", "false");
    expect(
      within(cardFor("Sunday")).getByText(coconutMilk),
    ).toBeInTheDocument();
  });

  it("says the Week out loud as names, without the descriptions", () => {
    render(<AWeek cookingDays={["sunday"]} mealBank={justButterChicken} />);

    spinIt();
    click(openerFor("Sunday")!);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sunday: Butter chicken",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent(coconutMilk);
  });

  it("shares the Week as names, without the descriptions", async () => {
    const shared = withAShareSheet();
    render(<AWeek cookingDays={["sunday"]} mealBank={justButterChicken} />);

    spinIt();
    click(openerFor("Sunday")!);
    await act(async () => {
      click(screen.getByRole("button", { name: /share/i }));
      await Promise.resolve();
    });

    expect(shared).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Sunday: Butter chicken" }),
    );
  });
});

describe("a Meal's Recipe", () => {
  const fryThePaste = "Fry the paste for two minutes longer than the page says";
  const grandmothers = "Grandmother's, off the back of the tin";
  const slowCooker = "Only if the slow cooker is free";
  const source = "https://recipes.example.com/bobotie";

  const bobotie: Meal = {
    id: "meal-Bobotie",
    name: "Bobotie",
    description: slowCooker,
    recipe: aRecipe({ source }),
  };

  const cookedBank = [
    ...aBankOfCooked(["Butter chicken", { method: fryThePaste }]),
    ...aBankOfDescribed(["Lasagne", grandmothers]),
    bobotie,
    ...aBankOf("Pad thai", "Shakshuka"),
  ];

  const withASpare = [...cookedBank, ...aBankOf("Ramen")];

  const justButterChicken = aBankOfCooked([
    "Butter chicken",
    { method: fryThePaste },
  ]);

  const openerFor = (day: string, name: string) =>
    within(cardFor(day)).queryByRole("button", {
      name: new RegExp(`^${name},`),
    });

  const wayInFor = (day: string) =>
    within(cardFor(day)).queryByRole("button", { name: /^recipe for/i });

  const theSheet = () => screen.queryByRole("dialog");

  const openTheRecipeOn = (day: string, name: string) => {
    click(openerFor(day, name)!);
    click(wayInFor(day)!);
  };

  const close = () => click(screen.getByRole("button", { name: /cancel/i }));

  const methodField = () => screen.getByLabelText(/method/i);

  const saveIt = () =>
    act(async () => {
      click(screen.getByRole("button", { name: /save/i }));
      await Promise.resolve();
    });

  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("offers a way into the Recipe of a drawn Meal that has one", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);

    expect(wayInFor("Sunday")).toHaveAccessibleName(
      "Recipe for Butter chicken",
    );
  });

  it("opens a Meal that has a Recipe and no description at all", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();

    expect(openerFor("Sunday", "Butter chicken")).toHaveAccessibleName(
      "Butter chicken, Recipe",
    );
  });

  it("says a Meal that holds both holds both", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Tuesday", "Bobotie")!);

    expect(openerFor("Tuesday", "Bobotie")).toHaveAccessibleName(
      "Bobotie, description and Recipe",
    );
    expect(
      within(cardFor("Tuesday")).getByText(slowCooker),
    ).toBeInTheDocument();
    expect(wayInFor("Tuesday")).toBeInTheDocument();
  });

  it("leaves a Meal with a description and no Recipe exactly as it was", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Monday", "Lasagne")!);

    expect(openerFor("Monday", "Lasagne")).toHaveAccessibleName(
      "Lasagne, description",
    );
    expect(
      within(cardFor("Monday")).getByText(grandmothers),
    ).toBeInTheDocument();
    expect(wayInFor("Monday")).toBeNull();
  });

  it("leaves a Meal with neither with nothing to open", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();

    expect(cardFor("Wednesday")).toHaveTextContent("Pad thai");
    expect(openerFor("Wednesday", "Pad thai")).toBeNull();
  });

  it("offers nothing on an empty day of a thin Week", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={justButterChicken} />);

    spinIt();

    expect(cardFor("Thursday")).toHaveTextContent(/no meal/i);
    expect(wayInFor("Thursday")).toBeNull();
  });

  it("offers nothing on a day the Household does not cook", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();

    expect(wayInFor("Friday")).toBeNull();
  });

  it("leaves the re-spin control exactly where it was, and the size it was", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={withASpare} />);

    spinIt();
    const respin = respinFor("Sunday");
    const size = respin.className;

    click(openerFor("Sunday", "Butter chicken")!);

    expect(respinFor("Sunday")).toBe(respin);
    expect(respinFor("Sunday").className).toBe(size);
  });

  it("brings the Recipe up over the Week, as the Meal Bank shows it", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    openTheRecipeOn("Sunday", "Butter chicken");

    expect(theSheet()).toHaveAccessibleName("Butter chicken");
    expect(methodField()).toHaveValue(fryThePaste);
  });

  it("offers the Source to follow from here", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    openTheRecipeOn("Tuesday", "Bobotie");

    expect(
      within(theSheet()!).getByRole("link", { name: source }),
    ).toHaveAttribute("href", source);
  });

  it("leaves the Week whole when the sheet closes, and turns no wheel", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Tuesday", "Bobotie")!);
    openTheRecipeOn("Sunday", "Butter chicken");
    close();

    expect(theSheet()).toBeNull();
    expect(theWheel()).toBeNull();
    for (const name of ["Butter chicken", "Lasagne", "Bobotie", "Pad thai"])
      expect(screen.getByText(name)).toBeInTheDocument();
  });

  it("returns to the Week with the same day panels open as before", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Tuesday", "Bobotie")!);
    openTheRecipeOn("Sunday", "Butter chicken");
    close();

    expect(
      within(cardFor("Tuesday")).getByText(slowCooker),
    ).toBeInTheDocument();
    expect(wayInFor("Sunday")).toBeInTheDocument();
  });

  it("hands focus back to the control that opened it", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);
    const wayIn = wayInFor("Sunday")!;
    wayIn.focus();
    click(wayIn);
    close();

    expect(wayIn).toHaveFocus();
  });

  it("closes on the back gesture rather than leaving the Week", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    openTheRecipeOn("Sunday", "Butter chicken");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(theSheet()).toBeNull();
    expect(screen.getByText("Butter chicken")).toBeInTheDocument();
  });

  it("closes the way in on the day it re-spins, and leaves another day's", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={withASpare} />);

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);
    click(openerFor("Tuesday", "Bobotie")!);

    click(respinFor("Tuesday"));

    expect(cardFor("Tuesday")).toHaveTextContent("Ramen");
    expect(wayInFor("Tuesday")).toBeNull();
    expect(wayInFor("Sunday")).toBeInTheDocument();
  });

  it("closes every way in when the Week is spun again", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);
    click(openerFor("Tuesday", "Bobotie")!);

    spinIt();

    expect(screen.queryByRole("button", { name: /^recipe for/i })).toBeNull();
  });

  it("opens nothing while the wheel is still turning", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={cookedBank} />);

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);
    const wayIn = wayInFor("Sunday")!;

    click(theSpin());
    click(wayIn);

    expect(theSheet()).toBeNull();
  });

  it("writes an edited Recipe back through the Household", async () => {
    const saveMeal = vi.fn(() => Promise.resolve(cookedBank[0]!));
    render(
      <AWeek
        cookingDays={cookingDays}
        mealBank={cookedBank}
        parts={{ saveMeal }}
      />,
    );

    spinIt();
    openTheRecipeOn("Sunday", "Butter chicken");
    fireEvent.change(methodField(), { target: { value: "Fry it longer" } });
    await saveIt();

    expect(saveMeal).toHaveBeenCalledWith("meal-Butter chicken", {
      ...wholeMeal(cookedBank[0]!),
      method: "Fry it longer",
    });
    expect(theSheet()).toBeNull();
  });

  it("leaves the Week it drew alone when a Recipe is saved", async () => {
    const saveMeal = vi.fn(() => Promise.resolve(cookedBank[0]!));
    render(
      <AWeek
        cookingDays={cookingDays}
        mealBank={cookedBank}
        parts={{ saveMeal }}
      />,
    );

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);
    const before = cookingDays.map(
      (day) => cardFor(dayLabels[day]).textContent,
    );

    click(wayInFor("Sunday")!);
    fireEvent.change(methodField(), { target: { value: "Fry it longer" } });
    await saveIt();

    expect(
      cookingDays.map((day) => cardFor(dayLabels[day]).textContent),
    ).toEqual(before);
    expect(theWheel()).toBeNull();
  });

  it("says the Week out loud as names, without the Recipe", () => {
    render(<AWeek cookingDays={["sunday"]} mealBank={justButterChicken} />);

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sunday: Butter chicken",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent(fryThePaste);
  });

  it("shares the Week as names, without the Recipe", async () => {
    const shared = withAShareSheet();
    render(<AWeek cookingDays={["sunday"]} mealBank={justButterChicken} />);

    spinIt();
    click(openerFor("Sunday", "Butter chicken")!);
    await act(async () => {
      click(screen.getByRole("button", { name: /share/i }));
      await Promise.resolve();
    });

    expect(shared).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Sunday: Butter chicken" }),
    );
  });
});
