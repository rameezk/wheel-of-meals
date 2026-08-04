import { z } from "zod";
import { mealSchema } from "./meal";
import { collapseWhitespace } from "./text";
import { slugSchema } from "./slug";

export const cookingDaySchema = z.enum([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

export type CookingDay = z.infer<typeof cookingDaySchema>;

export const daysOfTheWeek = cookingDaySchema.options;

export const noCookingDays = "A Household cooks on at least one day.";

export const cookingDaysSchema = z
  .array(cookingDaySchema)
  .min(1, noCookingDays)
  .transform((days) => daysOfTheWeek.filter((day) => days.includes(day)));

export const defaultCookingDays: CookingDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

export const householdSchema = z.object({
  slug: slugSchema,
  name: z.string().nullable(),
  cookingDays: cookingDaysSchema,
  mealBank: z.array(mealSchema),
  createdAt: z.iso.datetime(),
});

export type Household = z.infer<typeof householdSchema>;

export const householdNameMaxLength = 60;

const nameSchema = z
  .string()
  .transform(collapseWhitespace)
  .pipe(
    z
      .string()
      .max(
        householdNameMaxLength,
        `A Household name cannot be longer than ${householdNameMaxLength} characters.`,
      ),
  )
  .transform((value) => (value.length === 0 ? null : value));

export const updateHouseholdSchema = z
  .object({
    name: nameSchema.nullish(),
    cookingDays: cookingDaysSchema.optional(),
  })
  .refine(
    ({ name, cookingDays }) => name !== undefined || cookingDays !== undefined,
    "An edit has to change the name or the Cooking Days.",
  );

export type UpdateHousehold = z.infer<typeof updateHouseholdSchema>;
