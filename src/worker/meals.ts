import { Hono } from "hono";
import { z } from "zod";
import {
  duplicateMeal,
  invalidMeal,
  invalidRecipe,
  mealBankFull,
  notFound,
} from "../shared/api";
import {
  addMealSchema,
  mealBankMaxSize,
  mealSchema,
  saveMealSchema,
  type Meal,
  type SaveMeal,
} from "../shared/meal";
import { recipeOf, setRecipeSchema, type SetRecipe } from "../shared/recipe";
import { slugSchema, type Slug } from "../shared/slug";
import { firstIssue, readBody } from "./http";

const mealFallback = "That Meal cannot be saved as it is.";

const recipeFallback = "That Recipe cannot be saved as it is.";

const mealColumns = "id, name, description, source, ingredients, method";

const rowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  source: z.string().nullable(),
  ingredients: z.string().nullable(),
  method: z.string().nullable(),
});

const toMeal = (row: unknown): Meal => {
  const { id, name, description, ...parts } = rowSchema.parse(row);
  return mealSchema.parse({
    id,
    name,
    description,
    recipe: recipeOf(parts),
  });
};

export const readMealBank = async (
  db: D1Database,
  slug: Slug,
): Promise<Meal[]> => {
  const { results } = await db
    .prepare(
      `SELECT ${mealColumns} FROM meals
       WHERE household_slug = ?1
       ORDER BY lower(name)`,
    )
    .bind(slug)
    .all();

  return results.map(toMeal);
};

const insertMeal = (
  db: D1Database,
  slug: Slug,
  meal: { name: string; description: string | null },
) =>
  db
    .prepare(
      `INSERT INTO meals (id, household_slug, name, description, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5
       WHERE (SELECT COUNT(*) FROM meals WHERE household_slug = ?2) < ?6
       RETURNING ${mealColumns}`,
    )
    .bind(
      crypto.randomUUID(),
      slug,
      meal.name,
      meal.description,
      new Date().toISOString(),
      mealBankMaxSize,
    )
    .first();

const saveMeal = (
  db: D1Database,
  slug: Slug,
  id: string,
  meal: SaveMeal & { recipe: SetRecipe },
) =>
  db
    .prepare(
      `UPDATE meals
       SET name = ?3,
           description = ?4,
           source = ?5,
           ingredients = ?6,
           method = ?7
       WHERE id = ?1 AND household_slug = ?2
       RETURNING ${mealColumns}`,
    )
    .bind(
      id,
      slug,
      meal.name,
      meal.description,
      meal.recipe?.source ?? null,
      meal.recipe?.ingredients ?? null,
      meal.recipe?.method ?? null,
    )
    .first();

const removeMeal = (db: D1Database, slug: Slug, id: string) =>
  db
    .prepare(
      "DELETE FROM meals WHERE id = ?1 AND household_slug = ?2 RETURNING id",
    )
    .bind(id, slug)
    .first();

const isDuplicateName = (error: unknown) =>
  error instanceof Error && /UNIQUE constraint failed/i.test(error.message);

const householdExists = async (db: D1Database, slug: Slug) =>
  Boolean(
    await db
      .prepare("SELECT slug FROM households WHERE slug = ?1")
      .bind(slug)
      .first(),
  );

export const meals = new Hono<{ Bindings: Env }>();

meals.post("/api/households/:slug/meals", async (c) => {
  const slug = slugSchema.safeParse(c.req.param("slug"));
  if (!slug.success) return c.json(notFound, 404);
  if (!(await householdExists(c.env.DB, slug.data)))
    return c.json(notFound, 404);

  const meal = addMealSchema.safeParse(await readBody(c.req.raw));
  if (!meal.success)
    return c.json(invalidMeal(firstIssue(meal.error, mealFallback)), 400);

  try {
    const row = await insertMeal(c.env.DB, slug.data, meal.data);
    if (!row) return c.json(mealBankFull, 409);
    return c.json(toMeal(row), 201);
  } catch (error) {
    if (isDuplicateName(error)) return c.json(duplicateMeal, 409);
    throw error;
  }
});

meals.patch("/api/households/:slug/meals/:id", async (c) => {
  const slug = slugSchema.safeParse(c.req.param("slug"));
  if (!slug.success) return c.json(notFound, 404);

  const body = await readBody(c.req.raw);

  const meal = saveMealSchema.safeParse(body);
  if (!meal.success)
    return c.json(invalidMeal(firstIssue(meal.error, mealFallback)), 400);

  const recipe = setRecipeSchema.safeParse(body);
  if (!recipe.success)
    return c.json(invalidRecipe(firstIssue(recipe.error, recipeFallback)), 400);

  try {
    const row = await saveMeal(c.env.DB, slug.data, c.req.param("id"), {
      ...meal.data,
      recipe: recipe.data,
    });
    if (!row) return c.json(notFound, 404);
    return c.json(toMeal(row));
  } catch (error) {
    if (isDuplicateName(error)) return c.json(duplicateMeal, 409);
    throw error;
  }
});

meals.delete("/api/households/:slug/meals/:id", async (c) => {
  const slug = slugSchema.safeParse(c.req.param("slug"));
  if (!slug.success) return c.json(notFound, 404);

  const row = await removeMeal(c.env.DB, slug.data, c.req.param("id"));
  if (!row) return c.json(notFound, 404);

  return c.body(null, 204);
});
