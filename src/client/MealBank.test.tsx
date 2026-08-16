import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { duplicateMeal, mealBankFull } from "../shared/api";
import type { Meal } from "../shared/meal";
import { HouseholdPage } from "./HouseholdPage";
import { householdsInMemory } from "./households-in-memory";
import { wholeMeal } from "./meals";
import { landedHighlightMillis } from "./motion";
import { hasAMethodRecipe, hasASourceRecipe } from "./RecipeMarker";
import { methodTooLong } from "../shared/recipe";
import { removesTheRecipe } from "./Meal";
import { landedRowStyle } from "./styles";
import {
  aHousehold,
  aMeal,
  aMealWithARecipe,
  aRecipe,
  aSlug,
  aSource,
  withAClipboard,
  withAShareSheet,
  withNoSharing,
} from "./test-fixtures";

const lasagne: Meal = {
  id: "meal-2",
  name: "Lasagne",
  description: null,
  recipe: null,
};

const aubergine: Meal = {
  id: "meal-3",
  name: "Aubergine bake",
  description: null,
  recipe: null,
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

const rowFor = (meal: Meal) => screen.getByText(meal.name).closest("button");

const openRecipe = (meal: Meal) => userEvent.click(screen.getByText(meal.name));

const sourceField = () => screen.getByLabelText(/source/i);

const ingredientsField = () => screen.getByLabelText(/ingredients/i);

const methodField = () => screen.getByLabelText(/method/i);

const theSheet = (meal: Meal) =>
  screen.queryByRole("dialog", { name: meal.name });

const nameField = () => screen.getByLabelText(/^name$/i);

const highlightedRow = () =>
  rows().find((row) => row.className.includes(landedRowStyle)) ?? null;

const announcement = () => screen.getByRole("status").textContent;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
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

  it("edits a Meal's name from the sheet", async () => {
    const households = await showBank([aMeal]);
    const editing = vi.spyOn(households, "saveMeal");

    await openRecipe(aMeal);
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Butter Chicken");
    await press("Save");

    expect(await screen.findByText("Butter Chicken")).toBeInTheDocument();
    expect(screen.getByText(String(aMeal.description))).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(editing).toHaveBeenCalledWith(aSlug, aMeal.id, {
      ...wholeMeal(aMeal),
      name: "Butter Chicken",
    });
  });

  it("leaves the Meal as it was when an edit is abandoned", async () => {
    const households = await showBank([aMeal]);
    const editing = vi.spyOn(households, "saveMeal");

    await openRecipe(aMeal);
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Something else");
    await press("Cancel");
    await press(`Yes, discard the writing for ${aMeal.name}`);

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
    await openRecipe(aMeal);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await press("Cancel");
    households.refuseNextChange(duplicateMeal);
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
      recipe: null,
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

    await openRecipe(aMeal);
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Butter Chicken");
    await press("Save");

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

describe("a Meal's Recipe", () => {
  it("marks the rows that have one and leaves the rest unmarked", async () => {
    await showBank([aMeal, aMealWithARecipe]);

    expect(rows()[0]).not.toHaveTextContent(hasASourceRecipe);
    expect(rows()[0]).not.toHaveTextContent(hasAMethodRecipe);
    expect(rows()[1]).toHaveTextContent(hasASourceRecipe);
    expect(
      screen.getByRole("button", {
        name: new RegExp(`${aMealWithARecipe.name}.*${hasASourceRecipe}`),
      }),
    ).toBeInTheDocument();
  });

  it("opens over the Meal Bank from a row with no Recipe yet", async () => {
    await showBank([aMeal, aMealWithARecipe]);

    await openRecipe(aMeal);

    expect(theSheet(aMeal)).toBeInTheDocument();
    expect(sourceField()).toHaveValue("");
    expect(ingredientsField()).toHaveValue("");
    expect(methodField()).toHaveValue("");
    expect(screen.getByLabelText("Filter")).toBeInTheDocument();
  });

  it("labels its three parts in the order they are read", async () => {
    await showBank([aMeal]);

    await openRecipe(aMeal);

    const labels = screen
      .getAllByText(/^(Source|Ingredients|Method) \(optional\)$/)
      .map((label) => label.textContent);
    expect(labels).toEqual([
      "Source (optional)",
      "Ingredients (optional)",
      "Method (optional)",
    ]);
  });

  it("keeps a Source and marks the row it came from", async () => {
    const households = await showBank([aMeal]);
    const setting = vi.spyOn(households, "saveMeal");

    await openRecipe(aMeal);
    await userEvent.type(sourceField(), aSource);
    await press("Save");

    expect(setting).toHaveBeenCalledWith(aSlug, aMeal.id, {
      ...wholeMeal(aMeal),
      source: aSource,
    });
    await vi.waitFor(() => expect(theSheet(aMeal)).not.toBeInTheDocument());
    expect(rows()[0]).toHaveTextContent(hasASourceRecipe);
  });

  it("shows a kept Source as a link that opens in a new tab", async () => {
    await showBank([aMealWithARecipe]);

    await openRecipe(aMealWithARecipe);

    const link = screen.getByRole("link", { name: aSource });
    expect(link).toHaveAttribute("href", aSource);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("changes nothing when the sheet is cancelled", async () => {
    const households = await showBank([aMealWithARecipe]);
    const setting = vi.spyOn(households, "saveMeal");

    await openRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await press("Cancel");
    await press(`Yes, discard the writing for ${aMealWithARecipe.name}`);

    expect(theSheet(aMealWithARecipe)).not.toBeInTheDocument();
    expect(setting).not.toHaveBeenCalled();
    expect(rows()[0]).toHaveTextContent(hasASourceRecipe);
  });

  it("takes the Recipe and its marker away once the emptying is confirmed", async () => {
    await showBank([aMealWithARecipe]);

    await openRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await press("Save");

    expect(await screen.findByText(removesTheRecipe)).toBeInTheDocument();
    await press(`Yes, remove the Recipe for ${aMealWithARecipe.name}`);

    await vi.waitFor(() =>
      expect(theSheet(aMealWithARecipe)).not.toBeInTheDocument(),
    );
    expect(rows()[0]).not.toHaveTextContent(hasASourceRecipe);
    expect(rows()[0]).not.toHaveTextContent(hasAMethodRecipe);
  });

  it("keeps the Recipe and what was typed when the emptying is declined", async () => {
    const households = await showBank([aMealWithARecipe]);
    const setting = vi.spyOn(households, "saveMeal");

    await openRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(methodField(), "   ");
    await press("Save");
    await press(`Keep the Recipe for ${aMealWithARecipe.name}`);

    expect(setting).not.toHaveBeenCalled();
    expect(theSheet(aMealWithARecipe)).toBeInTheDocument();
    expect(sourceField()).toHaveValue("");
    expect(methodField()).toHaveValue("   ");
    expect(rows()[0]).toHaveTextContent(hasASourceRecipe);
  });

  it("saves an already-empty Recipe without asking, as there is nothing to lose", async () => {
    const households = await showBank([aMeal]);
    const setting = vi.spyOn(households, "saveMeal");

    await openRecipe(aMeal);
    await press("Save");

    expect(setting).toHaveBeenCalledWith(aSlug, aMeal.id, wholeMeal(aMeal));
    await vi.waitFor(() => expect(theSheet(aMeal)).not.toBeInTheDocument());
  });

  it("keeps Ingredients and a Method on their own, line for line", async () => {
    const households = await showBank([aMeal]);
    const setting = vi.spyOn(households, "saveMeal");
    const ingredients = "1 onion, chopped\n2 tbsp butter";
    const method = "Fry the paste.\n\nSimmer for an hour.";

    await openRecipe(aMeal);
    await userEvent.type(ingredientsField(), ingredients);
    await userEvent.type(methodField(), method);
    await press("Save");

    expect(setting).toHaveBeenCalledWith(aSlug, aMeal.id, {
      ...wholeMeal(aMeal),
      ingredients,
      method,
    });
    await vi.waitFor(() => expect(theSheet(aMeal)).not.toBeInTheDocument());
    expect(
      screen.getByRole("button", {
        name: new RegExp(`${aMeal.name}.*${hasAMethodRecipe}`),
      }),
    ).toBeInTheDocument();
    expect(rows()[0]).not.toHaveTextContent(hasASourceRecipe);
  });

  it("holds the question open when Enter is pressed instead of the answer", async () => {
    const households = await showBank([aMealWithARecipe]);
    const setting = vi.spyOn(households, "saveMeal");

    await openRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(sourceField(), "{Enter}{Enter}");

    expect(screen.getByText(removesTheRecipe)).toBeInTheDocument();
    expect(setting).not.toHaveBeenCalled();
    expect(rows()[0]).toHaveTextContent(hasASourceRecipe);
  });

  it("shows a kept Recipe's parts as they were typed when it is opened again", async () => {
    const written = {
      ...aMeal,
      recipe: aRecipe({
        ingredients: "1 onion, chopped\n2 tbsp butter",
        method: "Fry the paste.\n\nSimmer for an hour.",
      }),
    };
    await showBank([written]);

    await openRecipe(written);

    expect(sourceField()).toHaveValue("");
    expect(ingredientsField()).toHaveValue("1 onion, chopped\n2 tbsp butter");
    expect(methodField()).toHaveValue("Fry the paste.\n\nSimmer for an hour.");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("refuses a Method past its cap and says how long it may be", async () => {
    const households = await showBank([aMeal]);
    households.refuseNextChange({
      error: "invalid_recipe",
      message: methodTooLong,
    });

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Save");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /2000 characters/,
    );
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("refuses a Source that is not a link and says why", async () => {
    await showBank([aMeal]);

    await openRecipe(aMeal);
    await userEvent.type(sourceField(), "ftp://recipes.example.com/one");
    await press("Save");

    expect(await screen.findByRole("alert")).toHaveTextContent(/https/);
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("says so when a save fails and leaves what was typed where it is", async () => {
    const households = await showBank([aMeal]);

    await openRecipe(aMeal);
    await userEvent.type(sourceField(), aSource);
    households.failNextChange();
    await press("Save");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
    expect(theSheet(aMeal)).toBeInTheDocument();
    expect(sourceField()).toHaveValue(aSource);
  });

  it("moves focus into the sheet and back to the row it came from", async () => {
    await showBank([aMeal]);
    const row = rowFor(aMeal);

    await openRecipe(aMeal);
    expect(nameField()).toHaveFocus();

    await press("Cancel");

    expect(row).toHaveFocus();
  });

  it("walks its fields in order with the keyboard alone", async () => {
    await showBank([aMeal]);

    await openRecipe(aMeal);
    const sheet = within(theSheet(aMeal)!);
    expect(nameField()).toHaveFocus();

    await userEvent.tab();
    expect(sheet.getByLabelText(/description/i)).toHaveFocus();

    await userEvent.tab();
    expect(sourceField()).toHaveFocus();

    await userEvent.tab();
    expect(ingredientsField()).toHaveFocus();

    await userEvent.tab();
    expect(methodField()).toHaveFocus();
  });

  it("closes on Escape without writing anything", async () => {
    const households = await showBank([aMeal]);
    const setting = vi.spyOn(households, "saveMeal");

    await openRecipe(aMeal);
    await userEvent.keyboard("{Escape}");

    expect(theSheet(aMeal)).not.toBeInTheDocument();
    expect(setting).not.toHaveBeenCalled();
  });

  it("closes on the back gesture rather than leaving the app", async () => {
    await showBank([aMeal]);

    await openRecipe(aMeal);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(theSheet(aMeal)).not.toBeInTheDocument();
  });

  it("leaves the filter as it was when the sheet closes", async () => {
    await showBank([aMeal, aMealWithARecipe]);

    await filterBy("lamb");
    await openRecipe(aMealWithARecipe);
    await press("Cancel");

    expect(screen.getByLabelText("Filter")).toHaveValue("lamb");
    expect(rows()).toHaveLength(1);
  });

  it("keeps Delete working alongside the control that opens the sheet", async () => {
    await showBank([aMealWithARecipe]);

    await openRecipe(aMealWithARecipe);
    await press("Cancel");
    await press(`Delete ${aMealWithARecipe.name}`);
    await press(`Keep ${aMealWithARecipe.name}`);

    expect(theSheet(aMealWithARecipe)).not.toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });
});

describe("editing a whole Meal from one sheet", () => {
  it("writes a changed name and a new Method in one Save", async () => {
    const households = await showBank([aMeal]);
    const saving = vi.spyOn(households, "saveMeal");

    await openRecipe(aMeal);
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Butter Chicken");
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Save");

    expect(saving).toHaveBeenCalledWith(aSlug, aMeal.id, {
      ...wholeMeal(aMeal),
      name: "Butter Chicken",
      method: "Fry the paste.",
    });
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("no longer offers a separate Edit control on the row", async () => {
    await showBank([aMeal]);

    expect(
      screen.queryByRole("button", { name: `Edit ${aMeal.name}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Delete ${aMeal.name}` }),
    ).toBeInTheDocument();
  });

  it("titles the sheet by the Meal, not by a part of it", async () => {
    await showBank([aMealWithARecipe]);

    await openRecipe(aMealWithARecipe);

    expect(theSheet(aMealWithARecipe)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: aMealWithARecipe.name }),
    ).toBeInTheDocument();
  });

  it("gives the sheet no way to delete the Meal", async () => {
    await showBank([aMeal]);

    await openRecipe(aMeal);

    expect(
      within(theSheet(aMeal)!).queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });
});

describe("sharing a Recipe", () => {
  const written: Meal = {
    ...aMealWithARecipe,
    recipe: aRecipe({
      source: aSource,
      ingredients: "1 onion, chopped\n2 tbsp butter",
      method: "Fry the paste.\n\nSimmer for an hour.",
    }),
  };

  const asShared =
    "Lamb curry\n\n1 onion, chopped\n2 tbsp butter\n\nFry the paste.\n\nSimmer for an hour.";

  const shareControl = () =>
    screen.queryByRole("button", { name: "Share the Recipe" });

  afterEach(withNoSharing);

  it("hands the share sheet the Recipe as text where there is one", async () => {
    const share = withAShareSheet();
    await showBank([written]);

    await openRecipe(written);
    await press("Share the Recipe");

    expect(share).toHaveBeenCalledWith({
      title: "Lamb curry",
      text: asShared,
      url: aSource,
    });
    expect(await screen.findByText("Shared.")).toBeInTheDocument();
  });

  it("copies the Recipe where there is no share sheet", async () => {
    const writeText = withAClipboard();
    await showBank([written]);

    await openRecipe(written);
    await press("Share the Recipe");

    expect(writeText).toHaveBeenCalledWith(`${asShared}\n${aSource}`);
    expect(
      await screen.findByText("Copied to the clipboard."),
    ).toBeInTheDocument();
  });

  it("owns up when nothing was copied", async () => {
    const writeText = withAClipboard();
    writeText.mockRejectedValue(new Error("no"));
    await showBank([written]);

    await openRecipe(written);
    await press("Share the Recipe");

    expect(
      await screen.findByText("Nothing was copied. Try that again."),
    ).toBeInTheDocument();
  });

  it("leaves the Recipe as it was when the share sheet is dismissed", async () => {
    const share = withAShareSheet();
    const dismissal = new Error("no");
    dismissal.name = "AbortError";
    share.mockRejectedValue(dismissal);
    const households = await showBank([written]);
    const setting = vi.spyOn(households, "saveMeal");

    await openRecipe(written);
    await press("Share the Recipe");

    expect(screen.queryByText("Shared.")).not.toBeInTheDocument();
    expect(theSheet(written)).toBeInTheDocument();
    expect(sourceField()).toHaveValue(aSource);
    expect(setting).not.toHaveBeenCalled();
  });

  it("leaves the sheet open to carry on reading", async () => {
    withAShareSheet();
    await showBank([written]);

    await openRecipe(written);
    await press("Share the Recipe");

    expect(theSheet(written)).toBeInTheDocument();
    expect(methodField()).toHaveValue("Fry the paste.\n\nSimmer for an hour.");
  });

  it("shares the Recipe as saved rather than what is being typed", async () => {
    const share = withAShareSheet();
    await showBank([written]);

    await openRecipe(written);
    await userEvent.type(methodField(), " Not this.");
    await press("Share the Recipe");

    expect(share).toHaveBeenCalledWith({
      title: "Lamb curry",
      text: asShared,
      url: aSource,
    });
  });

  it("offers nothing to share on a Meal with no Recipe", async () => {
    await showBank([aMeal]);

    await openRecipe(aMeal);

    expect(shareControl()).not.toBeInTheDocument();
  });

  it("can be reached and operated with the keyboard alone", async () => {
    const share = withAShareSheet();
    await showBank([written]);

    await openRecipe(written);
    methodField().focus();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(shareControl()).toHaveFocus();

    await userEvent.keyboard("{Enter}");

    expect(share).toHaveBeenCalled();
  });

  it("stays offered while the emptying is being confirmed", async () => {
    await showBank([written]);

    await openRecipe(written);
    await userEvent.clear(sourceField());
    await userEvent.clear(ingredientsField());
    await userEvent.clear(methodField());
    await press("Save");

    expect(await screen.findByText(removesTheRecipe)).toBeInTheDocument();
    expect(shareControl()).toBeInTheDocument();
  });
});
