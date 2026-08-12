import { useState } from "react";
import type { Meal } from "../shared/meal";
import type { WholeMeal } from "./households";
import { forgetDraft, heldDraft, holdDraft } from "./meal-drafts";
import { wholeMeal } from "./meals";

type Question = "emptying" | "leaving";

export type MealWriting = {
  draft: WholeMeal;
  restored: boolean;
  unsaved: boolean;
  asking: Question | null;
  change: (part: Partial<WholeMeal>) => void;
  askToEmpty: () => void;
  askToLeave: () => void;
  keepWriting: () => void;
  dropTheDraft: () => void;
  leave: () => void;
};

const same = (one: WholeMeal, other: WholeMeal) =>
  one.name === other.name &&
  one.description === other.description &&
  one.source === other.source &&
  one.ingredients === other.ingredients &&
  one.method === other.method;

const opened = (meal: Meal) => {
  const saved = wholeMeal(meal);
  const held = heldDraft(meal.id);
  if (!held) return { draft: saved, restored: false };

  if (same(held, saved)) {
    forgetDraft(meal.id);
    return { draft: saved, restored: false };
  }

  return { draft: held, restored: true };
};

export const useMealWriting = (
  meal: Meal,
  onClose: () => void,
): MealWriting => {
  const [writing, setWriting] = useState(() => opened(meal));
  const [asking, setAsking] = useState<Question | null>(null);

  const saved = wholeMeal(meal);
  const unsaved = !same(writing.draft, saved);

  const hold = (draft: WholeMeal, restored: boolean) => {
    const untouched = same(draft, saved);
    if (untouched) forgetDraft(meal.id);
    else holdDraft(meal.id, draft);

    setWriting({ draft, restored: restored && !untouched });
    setAsking(null);
  };

  return {
    draft: writing.draft,
    restored: writing.restored,
    unsaved,
    asking,
    change: (part) => hold({ ...writing.draft, ...part }, writing.restored),
    askToEmpty: () => setAsking("emptying"),
    askToLeave: () => (unsaved ? setAsking("leaving") : onClose()),
    keepWriting: () => setAsking(null),
    dropTheDraft: () => hold(saved, false),
    leave: () => {
      forgetDraft(meal.id);
      onClose();
    },
  };
};
