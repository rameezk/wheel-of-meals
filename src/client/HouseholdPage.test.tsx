import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseholdPage } from "./HouseholdPage";
import { remember, remembered } from "./remembered";
import { aHousehold, aMeal, aSlug, answerWith } from "./test-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("a Household page", () => {
  it("asks the API for the Household its Slug opens", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    await screen.findByText(aSlug);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/households/${aSlug}`,
      expect.anything(),
    );
  });

  it("shows the whole week, marking the days it does not cook", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

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

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(screen.getByText(aSlug)).toBeInTheDocument();
  });

  it("falls back to the Slug while the Household is unnamed", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    expect(
      await screen.findByRole("heading", { name: aSlug }),
    ).toBeInTheDocument();
  });

  it("says the Meal Bank is empty when it holds nothing", async () => {
    answerWith(aHousehold);

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    expect(await screen.findByText(/no meals yet/i)).toBeInTheDocument();
  });

  it("spins a Week out of the Household's own Meal Bank", async () => {
    answerWith({
      ...aHousehold,
      cookingDays: ["sunday"],
      mealBank: [aMeal],
    });

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /^spin/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(screen.getByText("Sunday").closest("li")).toHaveTextContent(
      aMeal.name,
    );
  });

  it("becomes the remembered Household once it opens", async () => {
    answerWith({ ...aHousehold, name: "The Khans" });

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    await screen.findByRole("heading", { name: "The Khans" });
    expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" });
  });

  it("stops being the remembered Household once it opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });
    answerWith({ error: "not_found", message: "nope" }, 404);

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    await screen.findByRole("alert");
    expect(remembered()).toBeNull();
  });

  it("leaves the remembered Household alone when another Slug opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });
    answerWith({ error: "not_found", message: "nope" }, 404);

    render(
      <HouseholdPage
        slug="toast-jam-butter-plate"
        settings={false}
        onGo={() => {}}
      />,
    );

    await screen.findByRole("alert");
    expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" });
  });

  it("says plainly when the link opens nothing", async () => {
    answerWith({ error: "not_found", message: "nope" }, 404);

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /opens nothing/i,
    );
  });

  it("says so when the lookup fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<HouseholdPage slug={aSlug} settings={false} onGo={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
