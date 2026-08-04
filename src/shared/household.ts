import { z } from "zod";
import { mealSchema } from "./meal";
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

export const cookingDaysSchema = z.array(cookingDaySchema).min(1);

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
