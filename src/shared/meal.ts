import { z } from "zod";
import { collapseWhitespace } from "./text";

export const mealNameMaxLength = 100;
export const mealDescriptionMaxLength = 500;
export const mealBankMaxSize = 500;

export const mealSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export type Meal = z.infer<typeof mealSchema>;

const nameSchema = z
  .string()
  .transform(collapseWhitespace)
  .pipe(
    z
      .string()
      .min(1, "A Meal needs a name.")
      .max(
        mealNameMaxLength,
        `A Meal name cannot be longer than ${mealNameMaxLength} characters.`,
      ),
  );

const descriptionSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .max(
        mealDescriptionMaxLength,
        `A Meal description cannot be longer than ${mealDescriptionMaxLength} characters.`,
      ),
  )
  .transform((value) => (value.length === 0 ? null : value));

export const addMealSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema.nullish(),
  })
  .transform(({ name, description }) => ({
    name,
    description: description ?? null,
  }));

export type AddMeal = z.infer<typeof addMealSchema>;

export const editMealSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.nullish(),
  })
  .refine(
    ({ name, description }) => name !== undefined || description !== undefined,
    "An edit has to change the name or the description.",
  );

export type EditMeal = z.infer<typeof editMealSchema>;
