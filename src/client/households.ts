import type { Household, UpdateHousehold } from "../shared/household";
import type { Meal } from "../shared/meal";
import type { Slug } from "../shared/slug";
import type { MealDraft } from "./api";

export { Refusal, messageFor, type MealDraft } from "./api";

export type Households = {
  create: () => Promise<Household>;
  open: (slug: Slug, signal?: AbortSignal) => Promise<Household | null>;
  update: (slug: Slug, changes: UpdateHousehold) => Promise<Household>;
  addMeal: (slug: Slug, draft: MealDraft) => Promise<Meal>;
  editMeal: (slug: Slug, id: string, draft: MealDraft) => Promise<Meal>;
  removeMeal: (slug: Slug, id: string) => Promise<void>;
};
