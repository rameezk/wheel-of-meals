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
  editMealSchema,
  mealBankMaxSize,
  mealSchema,
  type EditMeal,
  type Meal,
} from "../shared/meal";
import { recipeOf, setRecipeSchema, type SetRecipe } from "../shared/recipe";
import { slugSchema, type Slug } from "../shared/slug";
import { firstIssue, readBody } from "./http";

const mealFallback = "That Meal cannot be saved as it is.";

const recipeFallback = "That Recipe cannot be saved as it is.";

const mealColumns = "id, name, description, source";

const rowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  source: z.string().nullable(),
});

const toMeal = (row: unknown): Meal => {
  const { id, name, description, source } = rowSchema.parse(row);
  return mealSchema.parse({ id, name, description, recipe: recipeOf(source) });
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

const updateMeal = (
  db: D1Database,
  slug: Slug,
  id: string,
  changes: EditMeal,
) =>
  db
    .prepare(
      `UPDATE meals
       SET name = COALESCE(?3, name),
           description = CASE WHEN ?4 THEN ?5 ELSE description END
       WHERE id = ?1 AND household_slug = ?2
       RETURNING ${mealColumns}`,
    )
    .bind(
      id,
      slug,
      changes.name ?? null,
      changes.description === undefined ? 0 : 1,
      changes.description ?? null,
    )
    .first();

const writeRecipe = (
  db: D1Database,
  slug: Slug,
  id: string,
  recipe: SetRecipe,
) =>
  db
    .prepare(
      `UPDATE meals
       SET source = ?3
       WHERE id = ?1 AND household_slug = ?2
       RETURNING ${mealColumns}`,
    )
    .bind(id, slug, recipe.source)
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

  const changes = editMealSchema.safeParse(await readBody(c.req.raw));
  if (!changes.success)
    return c.json(invalidMeal(firstIssue(changes.error, mealFallback)), 400);

  try {
    const row = await updateMeal(
      c.env.DB,
      slug.data,
      c.req.param("id"),
      changes.data,
    );
    if (!row) return c.json(notFound, 404);
    return c.json(toMeal(row));
  } catch (error) {
    if (isDuplicateName(error)) return c.json(duplicateMeal, 409);
    throw error;
  }
});

meals.put("/api/households/:slug/meals/:id/recipe", async (c) => {
  const slug = slugSchema.safeParse(c.req.param("slug"));
  if (!slug.success) return c.json(notFound, 404);

  const recipe = setRecipeSchema.safeParse(await readBody(c.req.raw));
  if (!recipe.success)
    return c.json(invalidRecipe(firstIssue(recipe.error, recipeFallback)), 400);

  const row = await writeRecipe(
    c.env.DB,
    slug.data,
    c.req.param("id"),
    recipe.data,
  );
  if (!row) return c.json(notFound, 404);

  return c.json(toMeal(row));
});

meals.delete("/api/households/:slug/meals/:id", async (c) => {
  const slug = slugSchema.safeParse(c.req.param("slug"));
  if (!slug.success) return c.json(notFound, 404);

  const row = await removeMeal(c.env.DB, slug.data, c.req.param("id"));
  if (!row) return c.json(notFound, 404);

  return c.body(null, 204);
});
