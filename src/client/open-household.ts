import { useEffect, useState } from "react";
import type { Household, UpdateHousehold } from "../shared/household";
import type { Meal } from "../shared/meal";
import type { Slug } from "../shared/slug";
import { messageFor, type Households, type MealDraft } from "./households";
import { forget, remember } from "./remembered";

type NotOpen =
  | { state: "looking" }
  | { state: "missing" }
  | { state: "failed"; message: string };

type Held = NotOpen | { state: "open"; household: Household };

export type OpenHousehold = {
  state: "open";
  household: Household;
  working: boolean;
  problem: string | null;
  dismiss: () => void;
  show: (household: Household) => void;
  update: (changes: UpdateHousehold) => Promise<Household | null>;
  addMeal: (draft: MealDraft) => Promise<Meal | null>;
  editMeal: (id: string, draft: MealDraft) => Promise<Meal | null>;
  removeMeal: (id: string) => Promise<Meal | null>;
};

export type Opening = NotOpen | OpenHousehold;

export const useOpenHousehold = (
  slug: Slug,
  households: Households,
): Opening => {
  const [held, setHeld] = useState<Held>({ state: "looking" });
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [asked, setAsked] = useState(slug);

  if (asked !== slug) {
    setAsked(slug);
    setHeld({ state: "looking" });
    setWorking(false);
    setProblem(null);
  }

  useEffect(() => {
    const controller = new AbortController();

    households
      .open(slug, controller.signal)
      .then((household) => {
        if (controller.signal.aborted) return;
        setHeld(
          household ? { state: "open", household } : { state: "missing" },
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setHeld({ state: "failed", message: messageFor(error) });
      });

    return () => controller.abort();
  }, [slug, households]);

  const { state } = held;
  const name = held.state === "open" ? held.household.name : null;

  useEffect(() => {
    if (state === "open") remember({ slug, name });
    else if (state === "missing") forget(slug);
  }, [state, name, slug]);

  if (held.state !== "open") return held;

  const { household } = held;

  const show = (household: Household) => setHeld({ state: "open", household });

  const attempt = async <Changed>(
    change: () => Promise<Changed>,
    mend: (household: Household, changed: Changed) => Household,
  ): Promise<Changed | null> => {
    setWorking(true);
    setProblem(null);
    try {
      const changed = await change();
      setHeld((held) =>
        held.state === "open"
          ? { state: "open", household: mend(held.household, changed) }
          : held,
      );
      return changed;
    } catch (error) {
      setProblem(messageFor(error));
      return null;
    } finally {
      setWorking(false);
    }
  };

  return {
    state: "open",
    household,
    working,
    problem,
    dismiss: () => setProblem(null),
    show,

    update: (changes) =>
      attempt(
        () => households.update(slug, changes),
        (_, updated) => updated,
      ),

    addMeal: (draft) =>
      attempt(
        () => households.addMeal(slug, draft),
        (held, added) => ({ ...held, mealBank: [...held.mealBank, added] }),
      ),

    editMeal: (id, draft) =>
      attempt(
        () => households.editMeal(slug, id, draft),
        (held, edited) => ({
          ...held,
          mealBank: held.mealBank.map((meal) =>
            meal.id === edited.id ? edited : meal,
          ),
        }),
      ),

    removeMeal: async (id) => {
      const going = household.mealBank.find((meal) => meal.id === id);
      if (!going) return null;

      return attempt(
        async () => {
          await households.removeMeal(slug, id);
          return going;
        },
        (held, removed) => ({
          ...held,
          mealBank: held.mealBank.filter((meal) => meal.id !== removed.id),
        }),
      );
    },
  };
};
