import { z } from "zod";
import { failure } from "../shared/api";
import {
  householdSchema,
  type Household,
  type UpdateHousehold,
} from "../shared/household";
import { mealSchema, type Meal } from "../shared/meal";
import type { Slug } from "../shared/slug";

export type MealDraft = { name: string; description: string };

export class Refusal extends Error {}

export const messageFor = (error: unknown) =>
  error instanceof Refusal ? error.message : failure.message;

const refusalSchema = z.object({ error: z.string(), message: z.string() });

const refuse = async (response: Response): Promise<never> => {
  const body = refusalSchema.safeParse(await response.json().catch(() => null));
  throw new Refusal(body.success ? body.data.message : failure.message);
};

const sending = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const updateHousehold = async (
  slug: Slug,
  changes: UpdateHousehold,
): Promise<Household> => {
  const response = await fetch(
    `/api/households/${slug}`,
    sending("PATCH", changes),
  );
  if (!response.ok) return refuse(response);
  return householdSchema.parse(await response.json());
};

export const addMeal = async (slug: Slug, draft: MealDraft): Promise<Meal> => {
  const response = await fetch(
    `/api/households/${slug}/meals`,
    sending("POST", draft),
  );
  if (!response.ok) return refuse(response);
  return mealSchema.parse(await response.json());
};

export const editMeal = async (
  slug: Slug,
  id: string,
  draft: MealDraft,
): Promise<Meal> => {
  const response = await fetch(
    `/api/households/${slug}/meals/${id}`,
    sending("PATCH", draft),
  );
  if (!response.ok) return refuse(response);
  return mealSchema.parse(await response.json());
};

export const deleteMeal = async (slug: Slug, id: string): Promise<void> => {
  const response = await fetch(`/api/households/${slug}/meals/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) return refuse(response);
};
