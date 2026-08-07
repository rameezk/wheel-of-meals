import { render, screen } from "@testing-library/react";
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
  aSlug,
  aStockedHousehold,
  withAShareSheet,
  withNoSharing,
} from "./test-fixtures";

const anotherSlug = "toast-jam-butter-plate";

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

  it("carries the count of Meals on the Meal Bank button", async () => {
    render(thePage(householdsInMemory(aStockedHousehold)));

    expect(
      await screen.findByRole("button", { name: /meal bank, 1 meal/i }),
    ).toBeInTheDocument();
  });

  it("opens the Meal Bank at its own path", async () => {
    const go = vi.fn();

    render(
      thePage(householdsInMemory(aStockedHousehold), {
        onGo: go,
      }),
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /meal bank/i }),
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
      screen.getByRole("button", { name: `Edit ${aMeal.name}` }),
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
