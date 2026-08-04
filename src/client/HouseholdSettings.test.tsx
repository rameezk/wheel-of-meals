import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CookingDay, Household } from "../shared/household";
import { dayLabels } from "./days";
import { HouseholdSettings } from "./HouseholdSettings";
import { aHousehold, aSlug, answerInTurn } from "./test-fixtures";

const showSettings = (
  household: Household = aHousehold,
  onChange = vi.fn(),
  onDone = vi.fn(),
) => {
  render(
    <HouseholdSettings
      household={household}
      onChange={onChange}
      onDone={onDone}
    />,
  );
  return { onChange, onDone };
};

const sentBody = () => {
  const body = vi.mocked(globalThis.fetch).mock.calls[0]?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "{}") as {
    name?: string | null;
    cookingDays?: CookingDay[];
  };
};

const pressSave = () =>
  userEvent.click(screen.getByRole("button", { name: /save/i }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Household settings", () => {
  it("saves a name the Household did not have", async () => {
    answerInTurn({ body: { ...aHousehold, name: "The Khans" } });
    const { onChange } = showSettings();

    await userEvent.type(screen.getByLabelText(/name/i), "The Khans");
    await pressSave();

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    expect(url).toBe(`/api/households/${aSlug}`);
    expect(options?.method).toBe("PATCH");
    expect(sentBody()).toEqual({ name: "The Khans" });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "The Khans" }),
    );
  });

  it("starts from the name and Cooking Days the Household already has", () => {
    showSettings({ ...aHousehold, name: "The Khans" });

    expect(screen.getByLabelText(/name/i)).toHaveValue("The Khans");
    expect(screen.getByRole("checkbox", { name: "Sunday" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Friday" })).not.toBeChecked();
  });

  it("offers every day of the week to choose from", () => {
    showSettings();

    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
  });

  it("sends only what changed, so a partner's edit is not overwritten", async () => {
    answerInTurn({ body: { ...aHousehold, cookingDays: ["monday"] } });
    showSettings({ ...aHousehold, name: "The Khans" });

    await userEvent.click(screen.getByRole("checkbox", { name: "Friday" }));
    await pressSave();

    expect(sentBody()).toEqual({
      cookingDays: [...aHousehold.cookingDays, "friday"],
    });
  });

  it("sends nothing at all when nothing was changed", async () => {
    answerInTurn({ body: aHousehold });
    const { onDone } = showSettings();

    await pressSave();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("saves any subset of the seven days, in week order", async () => {
    answerInTurn({ body: { ...aHousehold, cookingDays: ["monday"] } });
    showSettings();

    for (const day of ["Sunday", "Tuesday", "Wednesday", "Thursday"])
      await userEvent.click(screen.getByRole("checkbox", { name: day }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Saturday" }));
    await pressSave();

    expect(sentBody().cookingDays).toEqual(["monday", "saturday"]);
  });

  it("refuses to save a Household that cooks on no day", async () => {
    answerInTurn({ body: aHousehold });
    showSettings();

    for (const day of aHousehold.cookingDays)
      await userEvent.click(
        screen.getByRole("checkbox", { name: dayLabels[day] }),
      );

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/at least one day/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("clears the name back to nothing when it is emptied", async () => {
    answerInTurn({ body: aHousehold });
    showSettings({ ...aHousehold, name: "The Khans" });

    await userEvent.clear(screen.getByLabelText(/name/i));
    await pressSave();

    expect(sentBody().name).toBeNull();
  });

  it("leaves the settings behind once the change lands", async () => {
    answerInTurn({ body: { ...aHousehold, name: "The Khans" } });
    const { onDone } = showSettings();

    await userEvent.type(screen.getByLabelText(/name/i), "The Khans");
    await pressSave();

    expect(onDone).toHaveBeenCalled();
  });

  it("stays put and says why when the save is refused", async () => {
    answerInTurn({
      body: { error: "invalid_household", message: "That name is too long." },
      status: 400,
    });
    const { onChange, onDone } = showSettings();

    await userEvent.type(screen.getByLabelText(/name/i), "The Khans");
    await pressSave();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That name is too long.",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("says something went wrong when the save cannot be sent", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    showSettings();

    await userEvent.type(screen.getByLabelText(/name/i), "The Khans");
    await pressSave();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });

  it("leaves without saving when the change is abandoned", async () => {
    const { onChange, onDone } = showSettings();

    await userEvent.type(screen.getByLabelText(/name/i), "The Khans");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onDone).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
