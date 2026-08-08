import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { duplicateMeal, mealBankFull } from "../shared/api";
import type { Meal } from "../shared/meal";
import { HouseholdPage } from "./HouseholdPage";
import { householdsInMemory } from "./households-in-memory";
import { landedHighlightMillis } from "./motion";
import { landedRowStyle } from "./styles";
import { aHousehold, aMeal, aSlug } from "./test-fixtures";

const lasagne: Meal = { id: "meal-2", name: "Lasagne", description: null };

const aubergine: Meal = {
  id: "meal-3",
  name: "Aubergine bake",
  description: null,
};

const showBank = async (meals: Meal[] = []) => {
  const households = householdsInMemory({ ...aHousehold, mealBank: meals });

  render(
    <HouseholdPage
      slug={aSlug}
      view="meal-bank"
      onGo={() => {}}
      households={households}
    />,
  );
  await screen.findByLabelText("Filter");

  return households;
};

const typeName = (name: string) =>
  userEvent.type(screen.getByLabelText(/meal/i), name);

const addButton = () => screen.getByRole("button", { name: /^add$/i });

const pressAdd = () => userEvent.click(addButton());

const press = (name: string) =>
  userEvent.click(screen.getByRole("button", { name }));

const filterBy = (text: string) =>
  userEvent.type(screen.getByLabelText("Filter"), text);

const rows = () => screen.queryAllByRole("listitem");

const highlightedRow = () =>
  rows().find((row) => row.className.includes(landedRowStyle)) ?? null;

const announcement = () => screen.getByRole("status").textContent;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the Meal Bank", () => {
  it("counts what it holds", async () => {
    await showBank([aMeal, lasagne]);

    expect(screen.getByText("2 Meals")).toBeInTheDocument();
  });

  it("counts a single Meal in the singular", async () => {
    await showBank([aMeal]);

    expect(screen.getByText("1 Meal")).toBeInTheDocument();
  });

  it("lists every Meal it holds with its description", async () => {
    await showBank([aMeal, lasagne]);

    expect(screen.getByText(aMeal.name)).toBeInTheDocument();
    expect(screen.getByText(String(aMeal.description))).toBeInTheDocument();
    expect(screen.getByText(lasagne.name)).toBeInTheDocument();
  });

  it("points an empty Bank at adding the first Meal", async () => {
    await showBank();

    expect(screen.getByText(/no meals yet/i)).toBeInTheDocument();
  });

  it("adds a Meal without sending the rest of the Bank", async () => {
    const households = await showBank([aMeal]);
    const adding = vi.spyOn(households, "addMeal");

    await typeName("Lasagne");
    await pressAdd();

    expect(await screen.findByText("Lasagne")).toBeInTheDocument();
    expect(adding).toHaveBeenCalledWith(aSlug, {
      name: "Lasagne",
      description: "",
    });
  });

  it("empties the form after a Meal lands, ready for the next one", async () => {
    await showBank();

    await typeName("Lasagne");
    await pressAdd();

    await screen.findByText("Lasagne");
    expect(screen.getByLabelText(/meal/i)).toHaveValue("");
  });

  it("says why a duplicate was refused and keeps what was typed", async () => {
    const households = await showBank([aMeal]);
    households.refuseNextChange(duplicateMeal);

    await typeName("butter chicken");
    await pressAdd();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      duplicateMeal.message,
    );
    expect(screen.getByLabelText(/meal/i)).toHaveValue("butter chicken");
  });

  it("says why a full Meal Bank has no room for another", async () => {
    const households = await showBank([aMeal]);
    households.refuseNextChange(mealBankFull);

    await typeName("Lasagne");
    await pressAdd();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      mealBankFull.message,
    );
  });

  it("will not send a Meal with no name", async () => {
    const households = await showBank();
    const adding = vi.spyOn(households, "addMeal");

    await pressAdd();

    expect(adding).not.toHaveBeenCalled();
  });

  it("refuses a second Add while the first is still in flight", async () => {
    const households = await showBank();
    vi.spyOn(households, "addMeal").mockReturnValue(
      new Promise<Meal>(() => {}),
    );

    await typeName("Lasagne");
    await pressAdd();

    expect(addButton()).toBeDisabled();
  });

  it("edits a Meal in place", async () => {
    const households = await showBank([aMeal]);
    const editing = vi.spyOn(households, "editMeal");

    await press(`Edit ${aMeal.name}`);
    const name = screen.getByLabelText(/^name$/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Butter Chicken");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Butter Chicken")).toBeInTheDocument();
    expect(screen.getByText(String(aMeal.description))).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(editing).toHaveBeenCalledWith(aSlug, aMeal.id, {
      name: "Butter Chicken",
      description: aMeal.description,
    });
  });

  it("leaves the Meal as it was when an edit is abandoned", async () => {
    const households = await showBank([aMeal]);
    const editing = vi.spyOn(households, "editMeal");

    await press(`Edit ${aMeal.name}`);
    const name = screen.getByLabelText(/^name$/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Something else");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByText(aMeal.name)).toBeInTheDocument();
    expect(editing).not.toHaveBeenCalled();
  });

  it("deletes a Meal only once the deletion is confirmed", async () => {
    const households = await showBank([aMeal, lasagne]);
    const removing = vi.spyOn(households, "removeMeal");

    await press(`Delete ${aMeal.name}`);
    expect(removing).not.toHaveBeenCalled();

    await press(`Yes, delete ${aMeal.name}`);

    await vi.waitFor(() =>
      expect(screen.queryByText(aMeal.name)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(lasagne.name)).toBeInTheDocument();
    expect(removing).toHaveBeenCalledWith(aSlug, aMeal.id);
  });

  it("keeps the Meal when the deletion is backed out of", async () => {
    const households = await showBank([aMeal]);
    const removing = vi.spyOn(households, "removeMeal");

    await press(`Delete ${aMeal.name}`);
    await press(`Keep ${aMeal.name}`);

    expect(screen.getByText(aMeal.name)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Delete ${aMeal.name}` }),
    ).toBeInTheDocument();
    expect(removing).not.toHaveBeenCalled();
  });

  it("clears what was refused as soon as the cook moves on", async () => {
    const households = await showBank([aMeal]);
    households.refuseNextChange(duplicateMeal);

    await typeName("butter chicken");
    await pressAdd();
    await screen.findByRole("alert");
    await press(`Edit ${aMeal.name}`);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    households.refuseNextChange(duplicateMeal);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await pressAdd();
    await screen.findByRole("alert");
    await press(`Delete ${aMeal.name}`);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("narrows the Bank to the Meals whose name the filter matches", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("lasa");

    expect(screen.getByText(lasagne.name)).toBeInTheDocument();
    expect(screen.queryByText(aMeal.name)).not.toBeInTheDocument();
  });

  it("matches anywhere in the name, ignoring case and surrounding space", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("  CHICKEN  ");

    expect(screen.getByText(aMeal.name)).toBeInTheDocument();
    expect(screen.queryByText(lasagne.name)).not.toBeInTheDocument();
  });

  it("puts two names for the same dish next to each other", async () => {
    const curry: Meal = {
      id: "meal-3",
      name: "Butter chicken curry",
      description: null,
    };
    await showBank([aMeal, lasagne, curry]);

    await filterBy("butter");

    expect(rows().map((held) => held.textContent)).toEqual([
      expect.stringContaining(aMeal.name),
      expect.stringContaining(curry.name),
    ]);
  });

  it("does not match a Meal on its description", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("coconut");

    expect(screen.queryByText(aMeal.name)).not.toBeInTheDocument();
    expect(screen.getByText(/no meal matches/i)).toBeInTheDocument();
  });

  it("says how much of the Bank the filter is showing", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("lasa");

    expect(screen.getByText("1 of 2 Meals")).toBeInTheDocument();
  });

  it("still says a filter is on when it happens to match everything", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("n");

    expect(screen.getByText("2 of 2 Meals")).toBeInTheDocument();
  });

  it("drops a pending edit when the filter narrows past it", async () => {
    await showBank([aMeal, lasagne]);

    await press(`Edit ${aMeal.name}`);
    await filterBy("lasa");
    await userEvent.clear(screen.getByLabelText("Filter"));

    expect(
      screen.getByRole("button", { name: `Edit ${aMeal.name}` }),
    ).toBeInTheDocument();
  });

  it("disarms a pending deletion when the filter narrows past it", async () => {
    await showBank([aMeal, lasagne]);

    await press(`Delete ${aMeal.name}`);
    await filterBy("lasa");
    await userEvent.clear(screen.getByLabelText("Filter"));

    expect(
      screen.queryByRole("button", { name: `Yes, delete ${aMeal.name}` }),
    ).not.toBeInTheDocument();
  });

  it("says so when the filter matches nothing, rather than looking empty", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("sushi");

    expect(screen.getByText(/no meal matches/i)).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
    expect(screen.getByText("0 of 2 Meals")).toBeInTheDocument();
  });

  it("shows the whole Bank again once the filter is cleared", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("lasa");
    await userEvent.clear(screen.getByLabelText("Filter"));

    expect(screen.getByText(aMeal.name)).toBeInTheDocument();
    expect(screen.getByText(lasagne.name)).toBeInTheDocument();
    expect(screen.getByText("2 Meals")).toBeInTheDocument();
  });

  it("never seeds the add form from the filter", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("sushi");

    expect(screen.getByLabelText(/meal/i)).toHaveValue("");
    expect(addButton()).toBeDisabled();
  });

  it("highlights a Meal that lands, where the list put it", async () => {
    await showBank([aMeal, lasagne]);

    await typeName(aubergine.name);
    await pressAdd();

    await screen.findByText(aubergine.name);
    expect(highlightedRow()).toBe(rows()[0]);
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining(aubergine.name),
      expect.stringContaining(aMeal.name),
      expect.stringContaining(lasagne.name),
    ]);
  });

  it("lets the highlight settle on its own, with nothing to press", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await showBank([aMeal]);

    await typeName(lasagne.name);
    await pressAdd();
    await screen.findByText(lasagne.name);
    expect(highlightedRow()).not.toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(landedHighlightMillis));

    expect(highlightedRow()).toBeNull();
    expect(announcement()).toBe("");
  });

  it("says a Meal landed, for anyone who cannot see the highlight", async () => {
    await showBank([aMeal]);

    expect(announcement()).toBe("");

    await typeName(lasagne.name);
    await pressAdd();

    await screen.findByText(lasagne.name);
    expect(announcement()).toBe("Lasagne added");
  });

  it("carries the highlight to the second Meal added, leaving the first", async () => {
    await showBank([aMeal]);

    await typeName(lasagne.name);
    await pressAdd();
    await screen.findByText(lasagne.name);
    await typeName(aubergine.name);
    await pressAdd();
    await screen.findByText(aubergine.name);

    expect(
      rows().filter((row) => row.className.includes(landedRowStyle)),
    ).toHaveLength(1);
    expect(highlightedRow()).toHaveTextContent(aubergine.name);
  });

  it("highlights nothing when the add is refused", async () => {
    const households = await showBank([aMeal]);
    households.refuseNextChange(duplicateMeal);

    await typeName(aMeal.name);
    await pressAdd();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      duplicateMeal.message,
    );
    expect(highlightedRow()).toBeNull();
  });

  it("highlights nothing when a Meal is edited", async () => {
    await showBank([aMeal]);

    await press(`Edit ${aMeal.name}`);
    const name = screen.getByLabelText(/^name$/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Butter Chicken");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await screen.findByText("Butter Chicken");
    expect(highlightedRow()).toBeNull();
  });

  it("highlights nothing when a Meal is deleted", async () => {
    await showBank([aMeal, lasagne]);

    await press(`Delete ${aMeal.name}`);
    await press(`Yes, delete ${aMeal.name}`);

    await vi.waitFor(() => expect(rows()).toHaveLength(1));
    expect(highlightedRow()).toBeNull();
  });

  it("lifts a filter that would have hidden the Meal just added", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("lasa");
    await typeName(aubergine.name);
    await pressAdd();

    await screen.findByText(aubergine.name);
    expect(screen.getByLabelText("Filter")).toHaveValue("");
    expect(highlightedRow()).toHaveTextContent(aubergine.name);
    expect(rows()).toHaveLength(3);
  });

  it("leaves a filter the Meal just added matches", async () => {
    await showBank([aMeal, lasagne]);

    await filterBy("bake");
    await typeName(aubergine.name);
    await pressAdd();

    await screen.findByText(aubergine.name);
    expect(screen.getByLabelText("Filter")).toHaveValue("bake");
    expect(highlightedRow()).toHaveTextContent(aubergine.name);
    expect(rows()).toHaveLength(1);
  });

  it("says so when the Bank cannot be reached", async () => {
    const households = await showBank();
    households.failNextChange();

    await typeName("Lasagne");
    await pressAdd();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
