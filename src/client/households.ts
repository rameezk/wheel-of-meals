import { failure } from "../shared/api";
import type { Household, UpdateHousehold } from "../shared/household";
import type { Meal } from "../shared/meal";
import type { TypedRecipe } from "../shared/recipe";
import type { Slug } from "../shared/slug";

export type MealDraft = { name: string; description: string };

export type RecipeDraft = TypedRecipe;

export type WholeMeal = MealDraft & RecipeDraft;

export class Refusal extends Error {}

export const messageFor = (error: unknown) =>
  error instanceof Refusal ? error.message : failure.message;

export type Households = {
  create: () => Promise<Household>;
  open: (slug: Slug, signal?: AbortSignal) => Promise<Household | null>;
  update: (slug: Slug, changes: UpdateHousehold) => Promise<Household>;
  addMeal: (slug: Slug, draft: MealDraft) => Promise<Meal>;
  saveMeal: (slug: Slug, id: string, draft: WholeMeal) => Promise<Meal>;
  removeMeal: (slug: Slug, id: string) => Promise<void>;
};
