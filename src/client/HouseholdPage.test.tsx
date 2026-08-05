import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseholdPage } from "./HouseholdPage";
import { remember, remembered } from "./remembered";
import { skipFirstRun } from "./guiding";
import { mealSuggestions } from "./suggestions";
import {
  aHousehold,
  aMeal,
  aSlug,
  aStockedHousehold,
  answerInTurn,
  answerWith,
  withAShareSheet,
  withNoSharing,
} from "./test-fixtures";

const theGuide = () =>
  screen.queryByRole("heading", { name: /what do you cook often/i });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  withNoSharing();
});

describe("a Household page", () => {
  it("asks the API for the Household its Slug opens", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    await screen.findByText(aSlug);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/households/${aSlug}`,
      expect.anything(),
    );
  });

  it("shows the whole week, marking the days it does not cook", async () => {
    answerWith(aStockedHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

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
    answerWith({ ...aHousehold, name: "The Khans" });

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText(aSlug)).toBeInTheDocument();
  });

  it("falls back to the Slug while the Household is unnamed", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(
      await screen.findByRole("heading", { name: aSlug }),
    ).toBeInTheDocument();
  });

  it("points an empty Bank at the Meal Bank page rather than a form", async () => {
    skipFirstRun(aSlug);
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(
      await screen.findByText(/add a meal to the meal bank/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^meal$/i)).not.toBeInTheDocument();
  });

  it("carries the count of Meals on the Meal Bank button", async () => {
    answerWith(aStockedHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(
      await screen.findByRole("button", { name: /meal bank, 1 meal/i }),
    ).toBeInTheDocument();
  });

  it("opens the Meal Bank at its own path", async () => {
    const go = vi.fn();
    answerWith(aStockedHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={go} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /meal bank/i }),
    );

    expect(go).toHaveBeenCalledWith(`/${aSlug}/meal-bank`);
  });

  it("curates the Meal Bank on its own page, under the Household name", async () => {
    answerWith({ ...aHousehold, name: "The Khans", mealBank: [aMeal] });

    render(<HouseholdPage slug={aSlug} view="meal-bank" onGo={() => {}} />);

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
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="meal-bank" onGo={go} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /back to the household/i }),
    );

    expect(go).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("spins a Week out of the Household's own Meal Bank", async () => {
    answerWith({
      ...aHousehold,
      cookingDays: ["sunday"],
      mealBank: [aMeal],
    });

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

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
    answerWith({ ...aStockedHousehold, name: "The Khans" });

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

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
    answerWith({ ...aHousehold, name: "The Khans" });

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    await screen.findByRole("heading", { name: "The Khans" });
    await vi.waitFor(() =>
      expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" }),
    );
  });

  it("stops being the remembered Household once it opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });
    answerWith({ error: "not_found", message: "nope" }, 404);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    await screen.findByRole("alert");
    await vi.waitFor(() => expect(remembered()).toBeNull());
  });

  it("leaves the remembered Household alone when another Slug opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });
    answerWith({ error: "not_found", message: "nope" }, 404);

    render(
      <HouseholdPage
        slug="toast-jam-butter-plate"
        view="household"
        onGo={() => {}}
      />,
    );

    await screen.findByRole("alert");
    expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" });
  });

  it("says plainly when the link opens nothing", async () => {
    answerWith({ error: "not_found", message: "nope" }, 404);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /opens nothing/i,
    );
  });

  it("says so when the lookup fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

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
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(await screen.findByText(/what do you cook often/i)).toBeVisible();
    expect(screen.queryByText("Sunday")).not.toBeInTheDocument();
  });

  it("leaves a Household that already holds Meals alone", async () => {
    answerWith(aStockedHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    await screen.findByRole("button", { name: /spin the week/i });
    expect(theGuide()).not.toBeInTheDocument();
  });

  it("stays put while the Bank is being filled, one Meal at a time", async () => {
    answerInTurn({ body: aHousehold }, { body: aMeal });

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);
    await tapASuggestion();

    expect(theGuide()).toBeInTheDocument();
  });

  it("hands the filled Bank straight into a Spin", async () => {
    answerInTurn({ body: aHousehold }, { body: aMeal });

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);
    await tapASuggestion();
    await userEvent.click(
      screen.getByRole("button", { name: /spin the week/i }),
    );

    expect(theGuide()).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: /skip/i }));
    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      aMeal.name,
    );
  });

  it("spins once on the way out, not again on every visit back", async () => {
    answerInTurn({ body: aHousehold }, { body: aMeal });

    const { rerender } = render(
      <HouseholdPage slug={aSlug} view="household" onGo={() => {}} />,
    );
    await tapASuggestion();
    await userEvent.click(
      screen.getByRole("button", { name: /spin the week/i }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /skip/i }));

    rerender(<HouseholdPage slug={aSlug} view="settings" onGo={() => {}} />);
    rerender(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(screen.queryByRole("button", { name: /skip the spin/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /spin the week/i }),
    ).toBeInTheDocument();
  });

  it("falls back to the Household page when it is skipped", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);
    await userEvent.click(
      await screen.findByRole("button", { name: /skip for now/i }),
    );

    expect(theGuide()).not.toBeInTheDocument();
    expect(screen.getByText(/add a meal to the meal bank/i)).toBeVisible();
  });

  it("remembers being skipped, so the next visit is not asked again", async () => {
    answerWith(aHousehold);

    const { unmount } = render(
      <HouseholdPage slug={aSlug} view="household" onGo={() => {}} />,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /skip for now/i }),
    );
    unmount();

    answerWith(aHousehold);
    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(await screen.findByText("Sunday")).toBeVisible();
    expect(theGuide()).not.toBeInTheDocument();
  });

  it("stays out of the settings and the Meal Bank, whatever the Bank holds", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="meal-bank" onGo={() => {}} />);

    expect(await screen.findByLabelText("Filter")).toBeVisible();
    expect(theGuide()).not.toBeInTheDocument();
  });

  it("is over once the Bank has been filled somewhere else instead", async () => {
    answerWith(aHousehold);

    const { rerender } = render(
      <HouseholdPage slug={aSlug} view="meal-bank" onGo={() => {}} />,
    );
    await screen.findByLabelText("Filter");

    rerender(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(theGuide()).not.toBeInTheDocument();
    expect(screen.getByText("Sunday")).toBeVisible();
  });
});
