import { notFound } from "../shared/api";
import { defaultCookingDays, type Household } from "../shared/household";
import type { Meal } from "../shared/meal";
import { generateSlug } from "../shared/slug";
import { collapseWhitespace } from "../shared/text";
import { Refusal, type Households, type MealDraft } from "./households";

type NamedRefusal = { error: string; message: string };

type Trouble = NamedRefusal | "failure";

export type HouseholdsInMemory = Households & {
  refuseNextChange: (refusal: NamedRefusal) => void;
  failNextChange: () => void;
  failNextOpen: () => void;
};

const anEpoch = "2026-08-04T12:00:00.000Z";

const filledOut = (seed: Partial<Household>): Household => ({
  slug: seed.slug ?? generateSlug(Math.random),
  name: seed.name ?? null,
  cookingDays: seed.cookingDays ?? defaultCookingDays,
  mealBank: seed.mealBank ?? [],
  createdAt: seed.createdAt ?? anEpoch,
});

const byName = (one: Meal, other: Meal) =>
  one.name.toLowerCase().localeCompare(other.name.toLowerCase());

const written = (value: string | null | undefined) => {
  const collapsed = collapseWhitespace(value ?? "");
  return collapsed.length === 0 ? null : collapsed;
};

const described = (draft: MealDraft) => {
  const trimmed = draft.description.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const householdsInMemory = (
  ...seeds: Partial<Household>[]
): HouseholdsInMemory => {
  const held = new Map<string, Household>();
  for (const seed of seeds) {
    const household = filledOut(seed);
    held.set(household.slug, household);
  }

  let trouble: Trouble | null = null;
  let openFailing = false;
  let created = 0;

  const freshId = (): string => {
    const id = `meal-${++created}`;
    const taken = [...held.values()].some((household) =>
      household.mealBank.some((meal) => meal.id === id),
    );
    return taken ? freshId() : id;
  };

  const change = <Made>(make: () => Made): Promise<Made> =>
    new Promise((resolve) => {
      const pending = trouble;
      trouble = null;
      if (pending === "failure") throw new Error("The Worker is unreachable");
      if (pending) throw new Refusal(pending.message);
      resolve(make());
    });

  const householdAt = (slug: string): Household => {
    const household = held.get(slug);
    if (!household) throw new Refusal(notFound.message);
    return household;
  };

  const restock = (household: Household, mealBank: Meal[]) => {
    const restocked = { ...household, mealBank: [...mealBank].sort(byName) };
    held.set(restocked.slug, restocked);
    return restocked;
  };

  const mealOf = (household: Household, id: string): Meal => {
    const meal = household.mealBank.find((candidate) => candidate.id === id);
    if (!meal) throw new Refusal(notFound.message);
    return meal;
  };

  return {
    create: () =>
      change(() => {
        const household = filledOut({});
        held.set(household.slug, household);
        return household;
      }),

    open: (slug) => {
      const failing = openFailing;
      openFailing = false;
      return failing
        ? Promise.reject(new Error("The Worker is unreachable"))
        : Promise.resolve(held.get(slug) ?? null);
    },

    update: (slug, changes) =>
      change(() => {
        const household = householdAt(slug);
        const changed = {
          ...household,
          name:
            changes.name === undefined ? household.name : written(changes.name),
          cookingDays: changes.cookingDays ?? household.cookingDays,
        };
        held.set(slug, changed);
        return changed;
      }),

    addMeal: (slug, draft) =>
      change(() => {
        const household = householdAt(slug);
        const meal: Meal = {
          id: freshId(),
          name: collapseWhitespace(draft.name),
          description: described(draft),
        };
        restock(household, [...household.mealBank, meal]);
        return meal;
      }),

    editMeal: (slug, id, draft) =>
      change(() => {
        const household = householdAt(slug);
        const edited: Meal = {
          ...mealOf(household, id),
          name: collapseWhitespace(draft.name),
          description: described(draft),
        };
        restock(
          household,
          household.mealBank.map((meal) => (meal.id === id ? edited : meal)),
        );
        return edited;
      }),

    removeMeal: (slug, id) =>
      change(() => {
        const household = householdAt(slug);
        mealOf(household, id);
        restock(
          household,
          household.mealBank.filter((meal) => meal.id !== id),
        );
      }),

    refuseNextChange: (refusal) => {
      trouble = refusal;
    },

    failNextChange: () => {
      trouble = "failure";
    },

    failNextOpen: () => {
      openFailing = true;
    },
  };
};
