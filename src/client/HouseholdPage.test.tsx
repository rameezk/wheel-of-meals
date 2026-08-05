import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseholdPage } from "./HouseholdPage";
import { remember, remembered } from "./remembered";
import {
  aHousehold,
  aMeal,
  aSlug,
  answerWith,
  withAShareSheet,
  withNoSharing,
} from "./test-fixtures";

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
    answerWith(aHousehold);

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
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(
      await screen.findByText(/add a meal to the meal bank/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^meal$/i)).not.toBeInTheDocument();
  });

  it("carries the count of Meals on the Meal Bank button", async () => {
    answerWith({ ...aHousehold, mealBank: [aMeal] });

    render(<HouseholdPage slug={aSlug} view="household" onGo={() => {}} />);

    expect(
      await screen.findByRole("button", { name: /meal bank, 1 meal/i }),
    ).toBeInTheDocument();
  });

  it("opens the Meal Bank at its own path", async () => {
    const go = vi.fn();
    answerWith(aHousehold);

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
    answerWith({ ...aHousehold, name: "The Khans" });

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
