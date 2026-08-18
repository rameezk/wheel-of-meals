import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tooManyRequests } from "../shared/api";
import type { Household } from "../shared/household";
import type { Slug } from "../shared/slug";
import { HouseholdPage } from "./HouseholdPage";
import type { Households } from "./households";
import { householdsInMemory } from "./households-in-memory";
import { remember, remembered } from "./remembered";
import { skipFirstRun } from "./guiding";
import type { View } from "./route";
import { mealSuggestions } from "./suggestions";
import {
  aHousehold,
  aMeal,
  aMealWithARecipe,
  aSlug,
  aStockedHousehold,
  withAShareSheet,
  withNoSharing,
} from "./test-fixtures";

const anotherSlug = "toast-jam-butter-plate";

const friedLonger = "Fry the paste for two minutes longer than the page says";

type Opening = { slug?: Slug; view?: View; onGo?: (path: string) => void };

const thePage = (
  households: Households,
  { slug = aSlug, view = "household", onGo = () => {} }: Opening = {},
) => (
  <HouseholdPage slug={slug} view={view} onGo={onGo} households={households} />
);

const theGuide = () =>
  screen.queryByRole("heading", { name: /what do you cook often/i });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  withNoSharing();
});

describe("a Household page", () => {
  it("opens the Household its Slug names, through the port", async () => {
    const households = householdsInMemory(aHousehold);
    const opening = vi.spyOn(households, "open");

    render(thePage(households));

    await screen.findByText(aSlug);
    expect(opening).toHaveBeenCalledWith(aSlug, expect.any(AbortSignal));
  });

  it("shows the whole week, marking the days it does not cook", async () => {
    render(thePage(householdsInMemory(aStockedHousehold)));

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
    render(thePage(householdsInMemory({ ...aHousehold, name: "The Khans" })));

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText(aSlug)).toBeInTheDocument();
  });

  it("falls back to the Slug while the Household is unnamed", async () => {
    render(thePage(householdsInMemory(aHousehold)));

    expect(
      await screen.findByRole("heading", { name: aSlug }),
    ).toBeInTheDocument();
  });

  it("drops a lookup the Slug has moved on from", async () => {
    const households = householdsInMemory(aHousehold);
    const waiting: ((household: Household) => void)[] = [];
    vi.spyOn(households, "open").mockImplementation(
      () => new Promise<Household>((resolve) => waiting.push(resolve)),
    );

    const { rerender } = render(thePage(households));
    rerender(thePage(households, { slug: anotherSlug }));

    waiting[1]?.({ ...aHousehold, slug: anotherSlug, name: "The Naidoos" });
    waiting[0]?.({ ...aHousehold, name: "The Khans" });

    expect(
      await screen.findByRole("heading", { name: "The Naidoos" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("The Khans")).not.toBeInTheDocument();
  });

  it("points an empty Bank at the Meal Bank page rather than a form", async () => {
    skipFirstRun(aSlug);

    render(thePage(householdsInMemory(aHousehold)));

    expect(
      await screen.findByText(/add a meal to the meal bank/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^meal$/i)).not.toBeInTheDocument();
  });

  it("invites an empty Bank to be filled rather than counting nothing", async () => {
    skipFirstRun(aSlug);

    render(thePage(householdsInMemory(aHousehold)));

    const wayIn = await screen.findByRole("button", {
      name: /open the meal bank/i,
    });

    expect(wayIn).toHaveAccessibleName(/no meals yet - add the ones you cook/i);
    expect(wayIn).not.toHaveAccessibleName(/0 meals/i);
  });

  it("offers to open the Meal Bank and says what it holds", async () => {
    render(
      thePage(
        householdsInMemory({
          ...aHousehold,
          mealBank: [aMeal, { ...aMeal, id: "meal-2", name: "Bobotie" }],
        }),
      ),
    );

    expect(
      await screen.findByRole("button", { name: /open the meal bank/i }),
    ).toHaveAccessibleName(/2 meals to draw from/i);
  });

  it("counts a Bank of one Meal in the singular", async () => {
    render(thePage(householdsInMemory(aStockedHousehold)));

    expect(
      await screen.findByRole("button", { name: /open the meal bank/i }),
    ).toHaveAccessibleName(/1 meal to draw from/i);
  });

  it("opens the Meal Bank at its own path", async () => {
    const go = vi.fn();

    render(
      thePage(householdsInMemory(aStockedHousehold), {
        onGo: go,
      }),
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /open the meal bank/i }),
    );

    expect(go).toHaveBeenCalledWith(`/${aSlug}/meal-bank`);
  });

  it("curates the Meal Bank on its own page, under the Household name", async () => {
    render(
      thePage(householdsInMemory({ ...aStockedHousehold, name: "The Khans" }), {
        view: "meal-bank",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText(aSlug)).toBeInTheDocument();
    expect(screen.getByLabelText("Filter")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Delete ${aMeal.name}` }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sunday")).not.toBeInTheDocument();
  });

  it("returns to the Household from the Meal Bank", async () => {
    const go = vi.fn();

    render(
      thePage(householdsInMemory(aHousehold), { view: "meal-bank", onGo: go }),
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /back to the household/i }),
    );

    expect(go).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("spins a Week out of the Household's own Meal Bank", async () => {
    render(
      thePage(
        householdsInMemory({ ...aStockedHousehold, cookingDays: ["sunday"] }),
      ),
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /^spin/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      aMeal.name,
    );
  });

  it("writes a Recipe edited from the Week back into the Meal Bank", async () => {
    const households = householdsInMemory({
      ...aHousehold,
      cookingDays: ["sunday"],
      mealBank: [aMealWithARecipe],
    });
    const { rerender } = render(thePage(households));

    await userEvent.click(
      await screen.findByRole("button", { name: /^spin/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));
    await userEvent.click(
      screen.getByRole("button", { name: `Open ${aMealWithARecipe.name}` }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.type(screen.getByLabelText(/method/i), friedLonger);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(
      within(screen.getByRole("dialog")).getByText(
        (_, element) => element?.textContent === friedLonger,
      ),
    ).toBeInTheDocument();

    rerender(thePage(households, { view: "meal-bank" }));
    await userEvent.click(await screen.findByText(aMealWithARecipe.name));

    expect(
      within(screen.getByRole("dialog")).getByText(
        (_, element) => element?.textContent === friedLonger,
      ),
    ).toBeInTheDocument();
  });

  it("renames a bare drawn Meal from the Week and stands the Week on the change", async () => {
    const households = householdsInMemory({
      ...aHousehold,
      cookingDays: ["sunday", "monday"],
      mealBank: [
        { id: "meal-1", name: "Curry", description: null, recipe: null },
        { id: "meal-2", name: "Lasagne", description: null, recipe: null },
      ],
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(thePage(households));

    await userEvent.click(
      await screen.findByRole("button", { name: /^spin/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    const monday = screen.getByText("Monday").closest("li")!;
    await userEvent.click(screen.getByRole("button", { name: "Open Curry" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByLabelText(/^name$/i));
    await userEvent.type(screen.getByLabelText(/^name$/i), "Thai green curry");
    await userEvent.type(screen.getByLabelText(/method/i), friedLonger);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await userEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      "Thai green curry",
    );
    expect(monday).toHaveTextContent("Lasagne");
    expect(screen.queryByText("Curry")).not.toBeInTheDocument();
  });

  it("shares the Week under the Meals' current names, not the drawn ones", async () => {
    const share = withAShareSheet();
    const households = householdsInMemory({
      ...aHousehold,
      cookingDays: ["sunday"],
      mealBank: [
        { id: "meal-1", name: "Curry", description: null, recipe: null },
      ],
    });
    render(thePage(households));

    await userEvent.click(
      await screen.findByRole("button", { name: /^spin/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    await userEvent.click(screen.getByRole("button", { name: "Open Curry" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByLabelText(/^name$/i));
    await userEvent.type(screen.getByLabelText(/^name$/i), "Thai green curry");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await userEvent.click(screen.getByRole("button", { name: /close/i }));

    await userEvent.click(
      await screen.findByRole("button", { name: /share the week/i }),
    );

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Sunday: Thai green curry" }),
    );
  });

  it("shares the link a spouse needs to reach the same Meal Bank", async () => {
    const share = withAShareSheet();

    render(
      thePage(householdsInMemory({ ...aStockedHousehold, name: "The Khans" })),
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /share the household/i }),
    );

    expect(share).toHaveBeenCalledWith({
      title: "The Khans",
      url: `${location.origin}/${aSlug}`,
    });
    expect(screen.getByText(/shared/i)).toBeInTheDocument();
  });

  it("wears the settings Icon beside its label, not instead of it", async () => {
    render(thePage(householdsInMemory(aStockedHousehold)));

    const settings = await screen.findByRole("button", { name: "Settings" });
    expect(settings.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(settings).toHaveAccessibleName("Settings");
  });

  it("becomes the remembered Household once it opens", async () => {
    render(thePage(householdsInMemory({ ...aHousehold, name: "The Khans" })));

    await screen.findByRole("heading", { name: "The Khans" });
    await vi.waitFor(() =>
      expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" }),
    );
  });

  it("stops being the remembered Household once it opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });

    render(thePage(householdsInMemory()));

    await screen.findByRole("alert");
    await vi.waitFor(() => expect(remembered()).toBeNull());
  });

  it("leaves the remembered Household alone when another Slug opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });

    render(thePage(householdsInMemory(aHousehold), { slug: anotherSlug }));

    await screen.findByRole("alert");
    expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" });
  });

  it("says plainly when the link opens nothing", async () => {
    render(thePage(householdsInMemory()));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /opens nothing/i,
    );
  });

  it("passes on the Worker's sentence when the lookup is refused", async () => {
    const households = householdsInMemory(aHousehold);
    households.refuseNextOpen(tooManyRequests);

    render(thePage(households));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      tooManyRequests.message,
    );
  });

  it("leaves a refusal behind when the cook moves to another view", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const { rerender } = render(thePage(households, { view: "meal-bank" }));
    await screen.findByLabelText("Filter");

    households.refuseNextChange(tooManyRequests);
    await userEvent.type(screen.getByLabelText(/^meal$/i), "Lasagne");
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      tooManyRequests.message,
    );

    rerender(thePage(households, { view: "settings" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says so when the lookup fails", async () => {
    const households = householdsInMemory(aHousehold);
    households.failNextOpen();

    render(thePage(households));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});

describe("the first run of a Household", () => {
  const suggestion = mealSuggestions[0];

  const tapASuggestion = async () => {
    await userEvent.click(
      await screen.findByRole("button", { name: `Add ${suggestion}` }),
    );
  };

  it("guides a brand new Household rather than handing it an empty Week", async () => {
    render(thePage(householdsInMemory(aHousehold)));

    expect(await screen.findByText(/what do you cook often/i)).toBeVisible();
    expect(screen.queryByText("Sunday")).not.toBeInTheDocument();
  });

  it("leaves a Household that already holds Meals alone", async () => {
    render(thePage(householdsInMemory(aStockedHousehold)));

    await screen.findByRole("button", { name: /spin the week/i });
    expect(theGuide()).not.toBeInTheDocument();
  });

  it("stays put while the Bank is being filled, one Meal at a time", async () => {
    render(thePage(householdsInMemory(aHousehold)));
    await tapASuggestion();

    expect(theGuide()).toBeInTheDocument();
  });

  it("hands the filled Bank straight into a Spin", async () => {
    render(
      thePage(householdsInMemory({ ...aHousehold, cookingDays: ["sunday"] })),
    );
    await tapASuggestion();
    await userEvent.click(
      screen.getByRole("button", { name: /spin the week/i }),
    );

    expect(theGuide()).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: /skip/i }));
    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      suggestion,
    );
  });

  it("spins once on the way out, not again on every visit back", async () => {
    const households = householdsInMemory(aHousehold);

    const { rerender } = render(thePage(households));
    await tapASuggestion();
    await userEvent.click(
      screen.getByRole("button", { name: /spin the week/i }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /skip/i }));

    rerender(thePage(households, { view: "settings" }));
    rerender(thePage(households));

    expect(screen.queryByRole("button", { name: /skip the spin/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /spin the week/i }),
    ).toBeInTheDocument();
  });

  it("falls back to the Household page when it is skipped", async () => {
    render(thePage(householdsInMemory(aHousehold)));
    await userEvent.click(
      await screen.findByRole("button", { name: /skip for now/i }),
    );

    expect(theGuide()).not.toBeInTheDocument();
    expect(screen.getByText(/add a meal to the meal bank/i)).toBeVisible();
  });

  it("remembers being skipped, so the next visit is not asked again", async () => {
    const households = householdsInMemory(aHousehold);

    const { unmount } = render(thePage(households));
    await userEvent.click(
      await screen.findByRole("button", { name: /skip for now/i }),
    );
    unmount();

    render(thePage(households));

    expect(await screen.findByText("Sunday")).toBeVisible();
    expect(theGuide()).not.toBeInTheDocument();
  });

  it("stays out of the settings and the Meal Bank, whatever the Bank holds", async () => {
    render(thePage(householdsInMemory(aHousehold), { view: "meal-bank" }));

    expect(await screen.findByLabelText("Filter")).toBeVisible();
    expect(theGuide()).not.toBeInTheDocument();
  });

  it("is over once the Bank has been filled somewhere else instead", async () => {
    const households = householdsInMemory(aHousehold);

    const { rerender } = render(thePage(households, { view: "meal-bank" }));
    await screen.findByLabelText("Filter");

    rerender(thePage(households));

    expect(theGuide()).not.toBeInTheDocument();
    expect(screen.getByText("Sunday")).toBeVisible();
  });
});
