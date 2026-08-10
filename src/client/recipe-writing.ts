import { useState } from "react";
import type { Meal } from "../shared/meal";
import type { RecipeDraft } from "./households";
import { forgetDraft, heldDraft, holdDraft } from "./recipe-drafts";

type Question = "emptying" | "leaving";

export type RecipeWriting = {
  draft: RecipeDraft;
  restored: boolean;
  unsaved: boolean;
  asking: Question | null;
  change: (part: Partial<RecipeDraft>) => void;
  askToEmpty: () => void;
  askToLeave: () => void;
  keepWriting: () => void;
  dropTheDraft: () => void;
  leave: () => void;
};

const asTyped = (meal: Meal): RecipeDraft => ({
  source: meal.recipe?.source ?? "",
  ingredients: meal.recipe?.ingredients ?? "",
  method: meal.recipe?.method ?? "",
});

const same = (one: RecipeDraft, other: RecipeDraft) =>
  one.source === other.source &&
  one.ingredients === other.ingredients &&
  one.method === other.method;

const opened = (meal: Meal) => {
  const saved = asTyped(meal);
  const held = heldDraft(meal.id);
  if (!held) return { draft: saved, restored: false };

  if (same(held, saved)) {
    forgetDraft(meal.id);
    return { draft: saved, restored: false };
  }

  return { draft: held, restored: true };
};

export const useRecipeWriting = (
  meal: Meal,
  onClose: () => void,
): RecipeWriting => {
  const [writing, setWriting] = useState(() => opened(meal));
  const [asking, setAsking] = useState<Question | null>(null);

  const saved = asTyped(meal);
  const unsaved = !same(writing.draft, saved);

  const hold = (draft: RecipeDraft, restored: boolean) => {
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
