import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Meal } from "../shared/meal";
import { HouseholdPage } from "./HouseholdPage";
import {
  householdsInMemory,
  type HouseholdsInMemory,
} from "./households-in-memory";
import { discardsTheWriting, unsavedFromBefore } from "./Meal";
import {
  aHousehold,
  aMeal,
  aMealWithARecipe,
  aSlug,
  aSource,
  withNoSharing,
} from "./test-fixtures";

const lasagne: Meal = {
  id: "meal-2",
  name: "Lasagne",
  description: null,
  recipe: null,
};

const aBankOf = (meals: Meal[]) =>
  householdsInMemory({ ...aHousehold, mealBank: meals });

const showBank = async (households: HouseholdsInMemory) => {
  const shown = render(
    <HouseholdPage
      slug={aSlug}
      view="meal-bank"
      onGo={() => {}}
      households={households}
    />,
  );
  await screen.findByLabelText("Filter");
  return shown;
};

const press = (name: string | RegExp) =>
  userEvent.click(screen.getByRole("button", { name }));

const openRecipe = (meal: Meal) => userEvent.click(screen.getByText(meal.name));

const editRecipe = async (meal: Meal) => {
  await openRecipe(meal);
  await press("Edit");
};

const sourceField = () => screen.getByLabelText(/source/i);

const methodField = () => screen.getByLabelText(/method/i);

const nameField = () => screen.getByLabelText(/^name$/i);

const saveButton = () => screen.getByRole("button", { name: "Save" });

const theSheet = (meal: Meal) =>
  screen.queryByRole("dialog", { name: meal.name });

const editButton = () => screen.getByRole("button", { name: "Edit" });

const shows = (value: string) =>
  within(screen.getByRole("dialog")).getByText(
    (_, element) => element?.textContent === value,
  );

const theNotice = () => screen.queryByText(unsavedFromBefore);

const theQuestion = () => screen.queryByText(discardsTheWriting);

const goBack = () =>
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  withNoSharing();
});

describe("leaving an edit with unsaved changes", () => {
  it("asks before Cancel throws the writing away", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
    expect(methodField()).toHaveValue("Fry the paste.");
  });

  it("counts a changed name as unsaved work", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(nameField(), " curry");
    await press("Cancel");

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("counts a changed description as unsaved work", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(
      within(theSheet(aMeal)!).getByLabelText(/description/i),
      " tonight",
    );
    await press("Cancel");

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("asks before the keyboard throws the writing away", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await userEvent.keyboard("{Escape}");

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("asks before the back gesture throws the writing away", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    goBack();

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("returns to reading once the writing is let go of, then closes", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    goBack();
    await press(`Yes, discard the writing for ${aMeal.name}`);

    expect(editButton()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();

    goBack();
    expect(theSheet(aMeal)).not.toBeInTheDocument();
  });

  it("returns to reading from an untouched edit, asking nothing", async () => {
    await showBank(aBankOf([aMealWithARecipe]));

    await editRecipe(aMealWithARecipe);
    await press("Cancel");

    expect(theQuestion()).not.toBeInTheDocument();
    expect(editButton()).toBeInTheDocument();
    expect(theSheet(aMealWithARecipe)).toBeInTheDocument();
  });

  it("counts writing that has been put back as it was as untouched", async () => {
    await showBank(aBankOf([aMealWithARecipe]));

    await editRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(sourceField(), aSource);
    await press("Cancel");

    expect(theQuestion()).not.toBeInTheDocument();
    expect(editButton()).toBeInTheDocument();
  });

  it("returns to reading and writes nothing once the discard is confirmed", async () => {
    const households = aBankOf([aMeal]);
    const setting = vi.spyOn(households, "saveMeal");
    await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");
    await press(`Yes, discard the writing for ${aMeal.name}`);

    expect(editButton()).toBeInTheDocument();
    expect(theQuestion()).not.toBeInTheDocument();
    expect(setting).not.toHaveBeenCalled();
  });

  it("leaves the sheet as it was when the discard is declined", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");
    await press(`Keep writing ${aMeal.name}`);

    expect(theQuestion()).not.toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
    expect(methodField()).toHaveValue("Fry the paste.");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("asks inside the sheet rather than over it or in the browser", async () => {
    const confirming = vi.spyOn(window, "confirm");
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");

    expect(confirming).not.toHaveBeenCalled();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(theSheet(aMeal)).toContainElement(theQuestion());
  });

  it("has nothing left to lose straight after a save", async () => {
    await showBank(aBankOf([aMeal]));

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Save");
    await screen.findByRole("button", { name: "Edit" });

    await press("Edit");
    await press("Cancel");

    expect(theQuestion()).not.toBeInTheDocument();
    expect(editButton()).toBeInTheDocument();
  });
});

describe("a Recipe the device held on to", () => {
  it("gives back writing the tab was discarded in the middle of", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(methodField()).toHaveValue("Fry the paste.");
  });

  it("holds a half-written name across all five fields", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Bunny chow");
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(nameField()).toHaveValue("Bunny chow");
    expect(methodField()).toHaveValue("Fry the paste.");
  });

  it("restores an empty name with Save unavailable until one is filled", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.clear(nameField());
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(theNotice()).toBeInTheDocument();
    expect(nameField()).toHaveValue("");
    expect(saveButton()).toBeDisabled();

    await userEvent.type(nameField(), "Butter chicken");
    expect(saveButton()).toBeEnabled();
  });

  it("opens straight into editing when a draft is held", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(theNotice()).toBeInTheDocument();
    expect(methodField()).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
  });

  it("abandons work held under the old Recipe-only key", async () => {
    localStorage.setItem(
      "wheel-of-meals.recipe-drafts",
      JSON.stringify({
        [aMeal.id]: { source: "", ingredients: "", method: "Old writing." },
      }),
    );
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);

    expect(theNotice()).not.toBeInTheDocument();
    expect(editButton()).toBeInTheDocument();
    await press("Edit");
    expect(methodField()).toHaveValue("");
  });

  it("offers it as unsaved work rather than as the saved Recipe", async () => {
    const households = aBankOf([aMealWithARecipe]);
    const shown = await showBank(households);

    await editRecipe(aMealWithARecipe);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMealWithARecipe);

    expect(theNotice()).toBeInTheDocument();
    await press("Cancel");
    expect(theQuestion()).toBeInTheDocument();
  });

  it("hands back the saved Recipe as reading when it is discarded", async () => {
    const households = aBankOf([aMealWithARecipe]);
    const shown = await showBank(households);

    await editRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMealWithARecipe);
    await press(`Discard the unsaved writing for ${aMealWithARecipe.name}`);

    expect(theNotice()).not.toBeInTheDocument();
    expect(editButton()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: aSource })).toBeInTheDocument();
    expect(screen.queryByLabelText(/method/i)).not.toBeInTheDocument();
  });

  it("says nothing when it says the same as the saved Recipe", async () => {
    const households = aBankOf([aMealWithARecipe]);
    const shown = await showBank(households);

    await editRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(sourceField(), aSource);
    shown.unmount();

    await showBank(households);
    await openRecipe(aMealWithARecipe);

    expect(theNotice()).not.toBeInTheDocument();
    expect(editButton()).toBeInTheDocument();
  });

  it("is let go of the moment a save lands", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Save");
    await screen.findByRole("button", { name: "Edit" });
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(theNotice()).not.toBeInTheDocument();
    expect(shows("Fry the paste.")).toBeInTheDocument();
  });

  it("is let go of once the cook has discarded it", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");
    await press(`Yes, discard the writing for ${aMeal.name}`);
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(theNotice()).not.toBeInTheDocument();
    await press("Edit");
    expect(methodField()).toHaveValue("");
  });

  it("belongs to the Meal it was written for and no other", async () => {
    const households = aBankOf([aMeal, lasagne]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(lasagne);

    expect(theNotice()).not.toBeInTheDocument();
    await press("Edit");
    expect(methodField()).toHaveValue("");
  });

  it("never surfaces for a Meal that has since been deleted", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await press(`Delete ${aMeal.name}`);
    await press(`Yes, delete ${aMeal.name}`);
    await userEvent.type(screen.getByLabelText(/^meal$/i), aMeal.name);
    await press(/^add$/i);
    await openRecipe(aMeal);

    expect(theNotice()).not.toBeInTheDocument();
    await press("Edit");
    expect(methodField()).toHaveValue("");
  });

  it("stays on the device, telling the Worker nothing", async () => {
    const households = aBankOf([aMeal]);
    const setting = vi.spyOn(households, "saveMeal");
    const shown = await showBank(households);

    await editRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(setting).not.toHaveBeenCalled();
  });
});
