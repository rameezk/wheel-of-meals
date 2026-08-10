import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tooManyRequests } from "../shared/api";
import type { Household } from "../shared/household";
import type { Meal } from "../shared/meal";
import type { Slug } from "../shared/slug";
import type { Households } from "./households";
import { householdsInMemory } from "./households-in-memory";
import {
  useOpenHousehold,
  type OpenHousehold,
  type Opening,
} from "./open-household";
import { remember, remembered } from "./remembered";
import {
  aHousehold,
  aMeal,
  aSlug,
  aSource,
  aStockedHousehold,
} from "./test-fixtures";

const anotherSlug = "toast-jam-butter-plate";

const opening = (households: Households, slug: Slug = aSlug) =>
  renderHook(({ slug }) => useOpenHousehold(slug, households), {
    initialProps: { slug },
  });

const theProblem = (opening: Opening) =>
  opening.state === "failed" ? opening.message : null;

const opened = async (households: Households, slug: Slug = aSlug) => {
  const view = opening(households, slug);
  await waitFor(() => expect(view.result.current.state).toBe("open"));
  return {
    ...view,
    open: () => view.result.current as OpenHousehold,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("opening a Household", () => {
  it("is looking until the port answers", () => {
    const { result } = opening(householdsInMemory(aHousehold));

    expect(result.current.state).toBe("looking");
  });

  it("yields the Open Household the Slug names", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const open = vi.spyOn(households, "open");

    const { open: held } = await opened(households);

    expect(held().household).toEqual(aStockedHousehold);
    expect(open).toHaveBeenCalledWith(aSlug, expect.any(AbortSignal));
  });

  it("yields nothing found when the Slug opens nothing", async () => {
    const { result } = opening(householdsInMemory());

    await waitFor(() => expect(result.current.state).toBe("missing"));
  });

  it("passes on the Worker's sentence when the lookup is refused", async () => {
    const households = householdsInMemory(aHousehold);
    households.refuseNextOpen(tooManyRequests);

    const { result } = opening(households);

    await waitFor(() =>
      expect(result.current).toEqual({
        state: "failed",
        message: tooManyRequests.message,
      }),
    );
  });

  it("says something went wrong when the lookup fails", async () => {
    const households = householdsInMemory(aHousehold);
    households.failNextOpen();

    const { result } = opening(households);

    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(theProblem(result.current)).toMatch(/something went wrong/i);
  });

  it("drops a lookup the Slug has moved on from", async () => {
    const households = householdsInMemory(aHousehold);
    const waiting: ((household: Household) => void)[] = [];
    vi.spyOn(households, "open").mockImplementation(
      () => new Promise<Household>((resolve) => waiting.push(resolve)),
    );

    const { result, rerender } = opening(households);
    rerender({ slug: anotherSlug });

    act(() => {
      waiting[1]?.({ ...aHousehold, slug: anotherSlug, name: "The Naidoos" });
      waiting[0]?.({ ...aHousehold, name: "The Khans" });
    });

    await waitFor(() =>
      expect(result.current).toMatchObject({
        state: "open",
        household: { name: "The Naidoos" },
      }),
    );
  });

  it("goes back to looking while another Slug is being opened", async () => {
    const households = householdsInMemory(aHousehold);
    const { result, rerender } = await opened(households);

    rerender({ slug: anotherSlug });

    expect(result.current.state).toBe("looking");
  });

  it("remembers a Household that opens", async () => {
    await opened(householdsInMemory({ ...aHousehold, name: "The Khans" }));

    await waitFor(() =>
      expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" }),
    );
  });

  it("forgets a Slug that opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });

    const { result } = opening(householdsInMemory());

    await waitFor(() => expect(result.current.state).toBe("missing"));
    await waitFor(() => expect(remembered()).toBeNull());
  });

  it("leaves the remembered Household alone when another Slug opens nothing", async () => {
    remember({ slug: aSlug, name: "The Khans" });

    const { result } = opening(householdsInMemory(aHousehold), anotherSlug);

    await waitFor(() => expect(result.current.state).toBe("missing"));
    expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" });
  });
});

describe("changing an Open Household", () => {
  it("takes the whole Household the Worker returns", async () => {
    const { open } = await opened(householdsInMemory(aHousehold));

    const changed = await act(() => open().update({ name: "The Khans" }));

    expect(changed).toMatchObject({ name: "The Khans" });
    expect(open().household.name).toBe("The Khans");
  });

  it("appends a Meal to the Meal Bank it holds", async () => {
    const { open } = await opened(householdsInMemory(aStockedHousehold));

    const added = await act(() =>
      open().addMeal({ name: "Lasagne", description: "" }),
    );

    expect(added).toMatchObject({ name: "Lasagne" });
    expect(open().household.mealBank).toEqual([aMeal, added]);
  });

  it("replaces an edited Meal where it stands", async () => {
    const { open } = await opened(householdsInMemory(aStockedHousehold));

    const edited = await act(() =>
      open().editMeal(aMeal.id, { name: "Lasagne", description: "" }),
    );

    expect(open().household.mealBank).toEqual([edited]);
  });

  it("patches the Meal a Recipe was written to, leaving the rest of it alone", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const { open } = await opened(households);
    const reopen = vi.spyOn(households, "open");

    const written = await act(() =>
      open().setRecipe(aMeal.id, { source: aSource }),
    );

    expect(written).toEqual({ ...aMeal, recipe: { source: aSource } });
    expect(open().household.mealBank).toEqual([written]);
    expect(reopen).not.toHaveBeenCalled();
  });

  it("takes the Recipe off the Meal when an empty one is written", async () => {
    const { open } = await opened(
      householdsInMemory({
        ...aStockedHousehold,
        mealBank: [{ ...aMeal, recipe: { source: aSource } }],
      }),
    );

    const written = await act(() => open().setRecipe(aMeal.id, { source: "" }));

    expect(written).toEqual(aMeal);
    expect(open().household.mealBank).toEqual([aMeal]);
  });

  it("removes a Meal and resolves to the one that went", async () => {
    const { open } = await opened(householdsInMemory(aStockedHousehold));

    const removed = await act(() => open().removeMeal(aMeal.id));

    expect(removed).toEqual(aMeal);
    expect(open().household.mealBank).toEqual([]);
  });

  it("does not re-open the Household to see a change", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const { open } = await opened(households);
    const reopen = vi.spyOn(households, "open");

    await act(() => open().addMeal({ name: "Lasagne", description: "" }));

    expect(reopen).not.toHaveBeenCalled();
  });

  it("is working while a change is in flight", async () => {
    const households = householdsInMemory(aStockedHousehold);
    let finish: (meal: Meal) => void = () => {};
    vi.spyOn(households, "addMeal").mockImplementation(
      () =>
        new Promise<Meal>((resolve) => {
          finish = resolve;
        }),
    );
    const { open } = await opened(households);

    let change: Promise<unknown> = Promise.resolve();
    act(() => {
      change = open().addMeal({ name: "Lasagne", description: "" });
    });
    expect(open().working).toBe(true);

    await act(async () => {
      finish({
        id: "meal-2",
        name: "Lasagne",
        description: null,
        recipe: null,
      });
      await change;
    });
    expect(open().working).toBe(false);
  });
});

describe("a change an Open Household is refused", () => {
  it("becomes a problem rather than something thrown at a view", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const { open } = await opened(households);
    households.refuseNextChange(tooManyRequests);

    const added = await act(() =>
      open().addMeal({ name: "Lasagne", description: "" }),
    );

    expect(added).toBeNull();
    expect(open().problem).toBe(tooManyRequests.message);
    expect(open().household.mealBank).toEqual([aMeal]);
  });

  it("reads as something went wrong when the Worker cannot be reached", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const { open } = await opened(households);
    households.failNextChange();

    await act(() => open().removeMeal(aMeal.id));

    expect(open().problem).toMatch(/something went wrong/i);
  });

  it("is cleared at the start of the next change", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const { open } = await opened(households);
    households.failNextChange();
    await act(() => open().addMeal({ name: "Lasagne", description: "" }));

    await act(() => open().addMeal({ name: "Tacos", description: "" }));

    expect(open().problem).toBeNull();
  });

  it("can be dismissed", async () => {
    const households = householdsInMemory(aStockedHousehold);
    const { open } = await opened(households);
    households.failNextChange();
    await act(() => open().addMeal({ name: "Lasagne", description: "" }));

    act(() => open().dismiss());

    expect(open().problem).toBeNull();
  });
});

describe("an Open Household shown a Household from elsewhere", () => {
  it("holds the one it is shown", async () => {
    const { open } = await opened(householdsInMemory(aStockedHousehold));

    act(() => open().show({ ...aStockedHousehold, name: "The Khans" }));

    expect(open().household.name).toBe("The Khans");
  });
});
