import { Hono } from "hono";
import { z } from "zod";
import { invalidHousehold, notFound } from "../shared/api";
import {
  cookingDaysSchema,
  defaultCookingDays,
  updateHouseholdSchema,
  type Household,
  type UpdateHousehold,
} from "../shared/household";
import type { Meal } from "../shared/meal";
import { generateSlug, slugSchema, type Slug } from "../shared/slug";
import { firstIssue, readBody } from "./http";
import { readMealBank } from "./meals";

const slugAttempts = 8;

const fromJson = (raw: string): unknown => JSON.parse(raw) as unknown;

const rowSchema = z.object({
  slug: slugSchema,
  name: z.string().nullable(),
  cooking_days: z.string().transform(fromJson).pipe(cookingDaysSchema),
  created_at: z.iso.datetime(),
});

const toHousehold = (row: unknown, mealBank: Meal[] = []): Household => {
  const { slug, name, cooking_days, created_at } = rowSchema.parse(row);
  return {
    slug,
    name,
    cookingDays: cooking_days,
    mealBank,
    createdAt: created_at,
  };
};

const insertHousehold = (db: D1Database, slug: Slug, createdAt: string) =>
  db
    .prepare(
      `INSERT INTO households (slug, name, cooking_days, created_at)
       VALUES (?1, NULL, ?2, ?3)
       ON CONFLICT (slug) DO NOTHING
       RETURNING slug, name, cooking_days, created_at`,
    )
    .bind(slug, JSON.stringify(defaultCookingDays), createdAt)
    .first();

const createHousehold = async (db: D1Database): Promise<Household> => {
  const createdAt = new Date().toISOString();

  for (let attempt = 0; attempt < slugAttempts; attempt++) {
    const row = await insertHousehold(db, generateSlug(Math.random), createdAt);
    if (row) return toHousehold(row);
  }

  throw new Error(`No free Slug found in ${slugAttempts} attempts`);
};

const updateHousehold = (
  db: D1Database,
  slug: Slug,
  changes: UpdateHousehold,
) =>
  db
    .prepare(
      `UPDATE households
       SET name = CASE WHEN ?2 THEN ?3 ELSE name END,
           cooking_days = COALESCE(?4, cooking_days)
       WHERE slug = ?1
       RETURNING slug, name, cooking_days, created_at`,
    )
    .bind(
      slug,
      changes.name === undefined ? 0 : 1,
      changes.name ?? null,
      changes.cookingDays ? JSON.stringify(changes.cookingDays) : null,
    )
    .first();

const findHousehold = (db: D1Database, slug: Slug) =>
  db
    .prepare(
      "SELECT slug, name, cooking_days, created_at FROM households WHERE slug = ?1",
    )
    .bind(slug)
    .first();

export const householdCreationPath = "/api/households";

export const households = new Hono<{ Bindings: Env }>();

households.post(householdCreationPath, async (c) =>
  c.json(await createHousehold(c.env.DB), 201),
);

households.get("/api/households/:slug", async (c) => {
  const slug = slugSchema.safeParse(c.req.param("slug"));
  if (!slug.success) return c.json(notFound, 404);

  const row = await findHousehold(c.env.DB, slug.data);
  if (!row) return c.json(notFound, 404);

  return c.json(toHousehold(row, await readMealBank(c.env.DB, slug.data)));
});

households.patch("/api/households/:slug", async (c) => {
  const slug = slugSchema.safeParse(c.req.param("slug"));
  if (!slug.success) return c.json(notFound, 404);

  const changes = updateHouseholdSchema.safeParse(await readBody(c.req.raw));
  if (!changes.success)
    return c.json(
      invalidHousehold(
        firstIssue(changes.error, "That Household cannot be saved as it is."),
      ),
      400,
    );

  const row = await updateHousehold(c.env.DB, slug.data, changes.data);
  if (!row) return c.json(notFound, 404);

  return c.json(toHousehold(row, await readMealBank(c.env.DB, slug.data)));
});
