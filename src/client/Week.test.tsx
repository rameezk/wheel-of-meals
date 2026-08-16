import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { dayLabels } from "./days";
import { wholeMeal } from "./meals";
import { flipStaggerMillis, wheelSpinMillis } from "./motion";
import type { OpenHousehold } from "./open-household";
import { hasAMethodRecipe, hasASourceRecipe } from "./RecipeMarker";
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

describe("a drawn Meal's sheet", () => {
  const coconutMilk = "The one with the coconut milk";
  const grandmothers = "Grandmother's, off the back of the tin";
  const fryThePaste = "Fry the paste for two minutes longer than the page says";
  const source = "https://recipes.example.com/bobotie";

  const butterChicken: Meal = {
    id: "meal-Butter chicken",
    name: "Butter chicken",
    description: coconutMilk,
    recipe: null,
  };

  const lasagne: Meal = {
    id: "meal-Lasagne",
    name: "Lasagne",
    description: null,
    recipe: null,
  };

  const bobotie: Meal = {
    id: "meal-Bobotie",
    name: "Bobotie",
    description: grandmothers,
    recipe: aRecipe({ source, method: fryThePaste }),
  };

  const bank = [
    butterChicken,
    lasagne,
    bobotie,
    ...aBankOf("Pad thai", "Shakshuka"),
  ];

  const nameOn = (day: string, name: string) =>
    within(cardFor(day)).queryByRole("button", { name: `Open ${name}` });

  const theSheet = () => screen.queryByRole("dialog");

  const close = () => click(screen.getByRole("button", { name: /cancel/i }));

  const nameField = () => screen.getByLabelText(/^name$/i);

  const methodField = () => screen.getByLabelText(/method/i);

  const saveIt = () =>
    act(async () => {
      click(screen.getByRole("button", { name: /save/i }));
      await Promise.resolve();
    });

  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("offers every drawn Meal's name as something to open, bare ones included", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();

    expect(nameOn("Sunday", "Butter chicken")).toBeInTheDocument();
    expect(nameOn("Monday", "Lasagne")).toBeInTheDocument();
    expect(nameOn("Tuesday", "Bobotie")).toBeInTheDocument();
  });

  it("tells a screen reader each drawn Meal is one it can open", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();

    expect(nameOn("Monday", "Lasagne")).toHaveAccessibleName("Open Lasagne");
  });

  it("shows a drawn Meal's description on its row without any interaction", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();

    expect(
      within(cardFor("Sunday")).getByText(coconutMilk),
    ).toBeInTheDocument();
  });

  it("leaves a Meal with no description just its name on the row", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();

    expect(cardFor("Monday")).toHaveTextContent("Lasagne");
    expect(cardFor("Monday")).not.toHaveTextContent(coconutMilk);
  });

  it("offers nothing to open before the Week is spun", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    expect(screen.queryByRole("button", { name: /^open / })).toBeNull();
  });

  it("offers nothing to open on an empty day of a thin Week", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={[butterChicken]} />);

    spinIt();

    expect(cardFor("Thursday")).toHaveTextContent(/no meal/i);
    expect(
      within(cardFor("Thursday")).queryByRole("button", { name: /^open / }),
    ).toBeNull();
  });

  it("offers nothing to open on a day the Household does not cook", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();

    expect(
      within(cardFor("Friday")).queryByRole("button", { name: /^open / }),
    ).toBeNull();
  });

  it("brings the sheet up over the Week, on the Meal's current values", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();
    click(nameOn("Tuesday", "Bobotie")!);

    expect(theSheet()).toHaveAccessibleName("Bobotie");
    expect(methodField()).toHaveValue(fryThePaste);
    expect(
      within(theSheet()!).getByRole("link", { name: source }),
    ).toHaveAttribute("href", source);
  });

  it("opens a bare Meal's sheet just the same", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();
    click(nameOn("Monday", "Lasagne")!);

    expect(theSheet()).toHaveAccessibleName("Lasagne");
  });

  it("opens nothing while the wheel is still turning", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();
    const open = nameOn("Sunday", "Butter chicken")!;

    click(theSpin());
    click(open);

    expect(theSheet()).toBeNull();
  });

  it("leaves the Week whole when the sheet closes, and turns no wheel", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();
    click(nameOn("Sunday", "Butter chicken")!);
    close();

    expect(theSheet()).toBeNull();
    expect(theWheel()).toBeNull();
    for (const name of ["Butter chicken", "Lasagne", "Bobotie", "Pad thai"])
      expect(screen.getByText(name)).toBeInTheDocument();
  });

  it("hands focus back to the name that opened it", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();
    const open = nameOn("Sunday", "Butter chicken")!;
    open.focus();
    click(open);
    close();

    expect(open).toHaveFocus();
  });

  it("closes on the back gesture rather than leaving the Week", () => {
    render(<AWeek cookingDays={cookingDays} mealBank={bank} />);

    spinIt();
    click(nameOn("Sunday", "Butter chicken")!);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(theSheet()).toBeNull();
    expect(screen.getByText("Butter chicken")).toBeInTheDocument();
  });

  it("writes an edited Meal back through the Household", async () => {
    const saveMeal = vi.fn(() => Promise.resolve(butterChicken));
    render(
      <AWeek cookingDays={cookingDays} mealBank={bank} parts={{ saveMeal }} />,
    );

    spinIt();
    click(nameOn("Sunday", "Butter chicken")!);
    fireEvent.change(nameField(), { target: { value: "Thai green curry" } });
    fireEvent.change(methodField(), {
      target: { value: "Simmer for an hour" },
    });
    await saveIt();

    expect(saveMeal).toHaveBeenCalledWith("meal-Butter chicken", {
      ...wholeMeal(butterChicken),
      name: "Thai green curry",
      method: "Simmer for an hour",
    });
    expect(theSheet()).toBeNull();
  });

  it("leaves the drawn Week alone when a Meal is saved, and re-runs no flip", async () => {
    const saveMeal = vi.fn(() => Promise.resolve(butterChicken));
    render(
      <AWeek cookingDays={cookingDays} mealBank={bank} parts={{ saveMeal }} />,
    );

    spinIt();
    const before = cookingDays.map(
      (day) => cardFor(dayLabels[day]).textContent,
    );
    const monday = cardFor("Monday");

    click(nameOn("Sunday", "Butter chicken")!);
    fireEvent.change(methodField(), {
      target: { value: "Simmer for an hour" },
    });
    await saveIt();

    expect(
      cookingDays.map((day) => cardFor(dayLabels[day]).textContent),
    ).toEqual(before);
    expect(cardFor("Monday")).toBe(monday);
    expect(theWheel()).toBeNull();
  });

  it("keeps the sheet open with the writing intact when a save is refused", async () => {
    const saveMeal = vi.fn(() => Promise.resolve(null));
    render(
      <AWeek cookingDays={cookingDays} mealBank={bank} parts={{ saveMeal }} />,
    );

    spinIt();
    const before = cookingDays.map(
      (day) => cardFor(dayLabels[day]).textContent,
    );

    click(nameOn("Sunday", "Butter chicken")!);
    fireEvent.change(nameField(), { target: { value: "Lasagne" } });
    await saveIt();

    expect(theSheet()).toBeInTheDocument();
    expect(nameField()).toHaveValue("Lasagne");
    expect(
      cookingDays.map((day) => cardFor(dayLabels[day]).textContent),
    ).toEqual(before);
  });

  it("says the Week out loud as names, without the descriptions", () => {
    render(<AWeek cookingDays={["sunday"]} mealBank={[butterChicken]} />);

    spinIt();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sunday: Butter chicken",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent(coconutMilk);
  });

  it("shares the Week as names, without the descriptions", async () => {
    const shared = withAShareSheet();
    render(<AWeek cookingDays={["sunday"]} mealBank={[butterChicken]} />);

    spinIt();
    await act(async () => {
      click(screen.getByRole("button", { name: /share/i }));
      await Promise.resolve();
    });

    expect(shared).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Sunday: Butter chicken" }),
    );
  });
});

describe("a drawn Meal's Recipe", () => {
  const threeDays: CookingDay[] = ["sunday", "monday", "tuesday"];

  const withASource: Meal = {
    id: "meal-Bobotie",
    name: "Bobotie",
    description: null,
    recipe: aRecipe({ source: "https://recipes.example.com/bobotie" }),
  };

  const writtenByTheCook: Meal = {
    id: "meal-Shakshuka",
    name: "Shakshuka",
    description: null,
    recipe: aRecipe({ method: "Fry the paste for two minutes" }),
  };

  const withNoRecipe: Meal = {
    id: "meal-Lasagne",
    name: "Lasagne",
    description: null,
    recipe: null,
  };

  const bank = [withASource, writtenByTheCook, withNoRecipe];

  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("marks a drawn Meal whose Recipe has a Source as one to follow", () => {
    render(<AWeek cookingDays={threeDays} mealBank={bank} />);

    spinIt();

    expect(cardFor("Sunday")).toHaveTextContent(hasASourceRecipe);
    expect(cardFor("Sunday")).not.toHaveTextContent(hasAMethodRecipe);
  });

  it("marks a drawn Meal whose Recipe has no Source as one of its own", () => {
    render(<AWeek cookingDays={threeDays} mealBank={bank} />);

    spinIt();

    expect(cardFor("Monday")).toHaveTextContent(hasAMethodRecipe);
    expect(cardFor("Monday")).not.toHaveTextContent(hasASourceRecipe);
  });

  it("leaves a drawn Meal with no Recipe unmarked", () => {
    render(<AWeek cookingDays={threeDays} mealBank={bank} />);

    spinIt();

    expect(cardFor("Tuesday")).not.toHaveTextContent(hasASourceRecipe);
    expect(cardFor("Tuesday")).not.toHaveTextContent(hasAMethodRecipe);
  });
});
