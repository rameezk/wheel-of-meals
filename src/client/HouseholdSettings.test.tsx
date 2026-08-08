import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { invalidHousehold } from "../shared/api";
import type { Household } from "../shared/household";
import { dayLabels } from "./days";
import { HouseholdPage } from "./HouseholdPage";
import type { Households } from "./households";
import { householdsInMemory } from "./households-in-memory";
import type { View } from "./route";
import { aSlug, aStockedHousehold } from "./test-fixtures";

const thePage = (
  households: Households,
  onGo: (path: string) => void,
  view: View = "settings",
) => (
  <HouseholdPage slug={aSlug} view={view} onGo={onGo} households={households} />
);

const atSettings = async (
  households = householdsInMemory(aStockedHousehold),
) => {
  const onGo = vi.fn();
  const { rerender } = render(thePage(households, onGo));
  await screen.findByLabelText(/name/i);
  return {
    households,
    onGo,
    atTheHousehold: () => rerender(thePage(households, onGo, "household")),
  };
};

const held = (seed: Partial<Household>) =>
  householdsInMemory({ ...aStockedHousehold, ...seed });

const typeName = (name: string) =>
  userEvent.type(screen.getByLabelText(/name/i), name);

const toggle = (day: string) =>
  userEvent.click(screen.getByRole("checkbox", { name: day }));

const saveButton = () => screen.getByRole("button", { name: /save/i });

const pressSave = () => userEvent.click(saveButton());

const dayRow = (day: string) => screen.getByText(day).closest("li");

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("the settings of a Household", () => {
  it("starts from the name and Cooking Days the Household already has", async () => {
    await atSettings(held({ name: "The Khans" }));

    expect(screen.getByLabelText(/name/i)).toHaveValue("The Khans");
    expect(screen.getByRole("checkbox", { name: "Sunday" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Friday" })).not.toBeChecked();
  });

  it("offers every day of the week to choose from", async () => {
    await atSettings();

    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
  });

  it("saves a name the Household did not have, and shows it at once", async () => {
    const { households, onGo } = await atSettings();
    const updating = vi.spyOn(households, "update");

    await typeName("The Khans");
    await pressSave();

    expect(updating).toHaveBeenCalledWith(aSlug, { name: "The Khans" });
    expect(
      await screen.findByRole("heading", { name: "The Khans" }),
    ).toBeInTheDocument();
    expect(onGo).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("shows the new Week the moment the Cooking Days are saved", async () => {
    const { atTheHousehold } = await atSettings();

    await toggle("Friday");
    await pressSave();
    atTheHousehold();

    expect(dayRow("Friday")).not.toHaveTextContent(/not cooking/i);
    expect(dayRow("Saturday")).toHaveTextContent(/not cooking/i);
  });

  it("saves only what changed, so a partner's edit is not overwritten", async () => {
    const { households } = await atSettings(held({ name: "The Khans" }));
    const updating = vi.spyOn(households, "update");

    await toggle("Friday");
    await pressSave();

    expect(updating).toHaveBeenCalledWith(aSlug, {
      cookingDays: [...aStockedHousehold.cookingDays, "friday"],
    });
  });

  it("saves any subset of the seven days, in week order", async () => {
    const { households } = await atSettings();
    const updating = vi.spyOn(households, "update");

    for (const day of ["Sunday", "Tuesday", "Wednesday", "Thursday"])
      await toggle(day);
    await toggle("Saturday");
    await pressSave();

    expect(updating).toHaveBeenCalledWith(aSlug, {
      cookingDays: ["monday", "saturday"],
    });
  });

  it("clears the name back to nothing when it is emptied", async () => {
    const { households } = await atSettings(held({ name: "The Khans" }));
    const updating = vi.spyOn(households, "update");

    await userEvent.clear(screen.getByLabelText(/name/i));
    await pressSave();

    expect(updating).toHaveBeenCalledWith(aSlug, { name: null });
  });

  it("asks the Worker for nothing at all when nothing was changed", async () => {
    const { households, onGo } = await atSettings();
    const updating = vi.spyOn(households, "update");

    await pressSave();

    expect(updating).not.toHaveBeenCalled();
    expect(onGo).toHaveBeenCalledWith(`/${aSlug}`);
  });

  it("refuses to save a Household that cooks on no day", async () => {
    const { households } = await atSettings();
    const updating = vi.spyOn(households, "update");

    for (const day of aStockedHousehold.cookingDays)
      await toggle(dayLabels[day]);

    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/at least one day/i);
    expect(updating).not.toHaveBeenCalled();
  });

  it("stays put and passes on the Worker's own sentence when refused", async () => {
    const { households, onGo } = await atSettings();
    const refusal = invalidHousehold("That name is too long.");
    households.refuseNextChange(refusal);

    await typeName("The Khans");
    await pressSave();

    expect(await screen.findByRole("alert")).toHaveTextContent(refusal.message);
    expect(screen.getByRole("heading", { name: aSlug })).toBeInTheDocument();
    expect(onGo).not.toHaveBeenCalled();
  });

  it("says something went wrong when the save cannot be sent", async () => {
    const { households } = await atSettings();
    households.failNextChange();

    await typeName("The Khans");
    await pressSave();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });

  it("holds Save back while a save is still in flight", async () => {
    const { households } = await atSettings();
    vi.spyOn(households, "update").mockReturnValue(new Promise(() => {}));

    await typeName("The Khans");
    await pressSave();

    expect(saveButton()).toBeDisabled();
  });

  it("leaves without saving when the change is abandoned", async () => {
    const { households, onGo } = await atSettings();
    const updating = vi.spyOn(households, "update");

    await typeName("The Khans");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onGo).toHaveBeenCalledWith(`/${aSlug}`);
    expect(updating).not.toHaveBeenCalled();
  });
});
