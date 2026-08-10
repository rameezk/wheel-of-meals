import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Meal } from "../shared/meal";
import { HouseholdPage } from "./HouseholdPage";
import {
  householdsInMemory,
  type HouseholdsInMemory,
} from "./households-in-memory";
import { discardsTheWriting, unsavedFromBefore } from "./Recipe";
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

const sourceField = () => screen.getByLabelText(/source/i);

const methodField = () => screen.getByLabelText(/method/i);

const theSheet = (meal: Meal) =>
  screen.queryByRole("dialog", {
    name: new RegExp(`Recipe for\\s*${meal.name}`),
  });

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

describe("closing a Recipe sheet with unsaved changes", () => {
  it("asks before the close control throws the writing away", async () => {
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
    expect(methodField()).toHaveValue("Fry the paste.");
  });

  it("asks before the keyboard throws the writing away", async () => {
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await userEvent.keyboard("{Escape}");

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("asks before the back gesture throws the writing away", async () => {
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    goBack();

    expect(theQuestion()).toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
  });

  it("still closes the back gesture once the writing is let go of", async () => {
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    goBack();
    await press(`Yes, discard the writing for ${aMeal.name}`);

    expect(theSheet(aMeal)).not.toBeInTheDocument();
  });

  it("closes an untouched sheet at once, asking nothing", async () => {
    await showBank(aBankOf([aMealWithARecipe]));

    await openRecipe(aMealWithARecipe);
    await press("Cancel");

    expect(theSheet(aMealWithARecipe)).not.toBeInTheDocument();
  });

  it("counts writing that has been put back as it was as untouched", async () => {
    await showBank(aBankOf([aMealWithARecipe]));

    await openRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(sourceField(), aSource);
    await press("Cancel");

    expect(theSheet(aMealWithARecipe)).not.toBeInTheDocument();
  });

  it("closes and writes nothing once the discard is confirmed", async () => {
    const households = aBankOf([aMeal]);
    const setting = vi.spyOn(households, "setRecipe");
    await showBank(households);

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");
    await press(`Yes, discard the writing for ${aMeal.name}`);

    expect(theSheet(aMeal)).not.toBeInTheDocument();
    expect(setting).not.toHaveBeenCalled();
  });

  it("leaves the sheet as it was when the discard is declined", async () => {
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");
    await press(`Keep writing the Recipe for ${aMeal.name}`);

    expect(theQuestion()).not.toBeInTheDocument();
    expect(theSheet(aMeal)).toBeInTheDocument();
    expect(methodField()).toHaveValue("Fry the paste.");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("asks inside the sheet rather than over it or in the browser", async () => {
    const confirming = vi.spyOn(window, "confirm");
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");

    expect(confirming).not.toHaveBeenCalled();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(theSheet(aMeal)).toContainElement(theQuestion());
  });

  it("has nothing left to lose straight after a save", async () => {
    await showBank(aBankOf([aMeal]));

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Save");
    await vi.waitFor(() => expect(theSheet(aMeal)).not.toBeInTheDocument());

    await openRecipe(aMeal);
    await press("Cancel");

    expect(theSheet(aMeal)).not.toBeInTheDocument();
    expect(theQuestion()).not.toBeInTheDocument();
  });
});

describe("a Recipe the device held on to", () => {
  it("gives back writing the tab was discarded in the middle of", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(methodField()).toHaveValue("Fry the paste.");
  });

  it("offers it as unsaved work rather than as the saved Recipe", async () => {
    const households = aBankOf([aMealWithARecipe]);
    const shown = await showBank(households);

    await openRecipe(aMealWithARecipe);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMealWithARecipe);

    expect(theNotice()).toBeInTheDocument();
    await press("Cancel");
    expect(theQuestion()).toBeInTheDocument();
  });

  it("hands back the saved Recipe when it is discarded", async () => {
    const households = aBankOf([aMealWithARecipe]);
    const shown = await showBank(households);

    await openRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMealWithARecipe);
    await press(`Discard the unsaved writing for ${aMealWithARecipe.name}`);

    expect(theNotice()).not.toBeInTheDocument();
    expect(sourceField()).toHaveValue(aSource);
    expect(methodField()).toHaveValue("");
    await press("Cancel");
    expect(theSheet(aMealWithARecipe)).not.toBeInTheDocument();
  });

  it("says nothing when it says the same as the saved Recipe", async () => {
    const households = aBankOf([aMealWithARecipe]);
    const shown = await showBank(households);

    await openRecipe(aMealWithARecipe);
    await userEvent.clear(sourceField());
    await userEvent.type(sourceField(), aSource);
    shown.unmount();

    await showBank(households);
    await openRecipe(aMealWithARecipe);

    expect(theNotice()).not.toBeInTheDocument();
    await press("Cancel");
    expect(theSheet(aMealWithARecipe)).not.toBeInTheDocument();
  });

  it("is let go of the moment a save lands", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Save");
    await vi.waitFor(() => expect(theSheet(aMeal)).not.toBeInTheDocument());
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(theNotice()).not.toBeInTheDocument();
    expect(methodField()).toHaveValue("Fry the paste.");
  });

  it("is let go of once the cook has discarded it", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    await press("Cancel");
    await press(`Yes, discard the writing for ${aMeal.name}`);
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(theNotice()).not.toBeInTheDocument();
    expect(methodField()).toHaveValue("");
  });

  it("belongs to the Meal it was written for and no other", async () => {
    const households = aBankOf([aMeal, lasagne]);
    const shown = await showBank(households);

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(lasagne);

    expect(theNotice()).not.toBeInTheDocument();
    expect(methodField()).toHaveValue("");
  });

  it("never surfaces for a Meal that has since been deleted", async () => {
    const households = aBankOf([aMeal]);
    const shown = await showBank(households);

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await press(`Delete ${aMeal.name}`);
    await press(`Yes, delete ${aMeal.name}`);
    await userEvent.type(screen.getByLabelText(/^meal$/i), aMeal.name);
    await press(/^add$/i);
    await openRecipe(aMeal);

    expect(theNotice()).not.toBeInTheDocument();
    expect(methodField()).toHaveValue("");
  });

  it("stays on the device, telling the Worker nothing", async () => {
    const households = aBankOf([aMeal]);
    const setting = vi.spyOn(households, "setRecipe");
    const shown = await showBank(households);

    await openRecipe(aMeal);
    await userEvent.type(methodField(), "Fry the paste.");
    shown.unmount();

    await showBank(households);
    await openRecipe(aMeal);

    expect(setting).not.toHaveBeenCalled();
  });
});
