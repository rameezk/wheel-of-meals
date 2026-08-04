import { z } from "zod";

export const mealSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export type Meal = z.infer<typeof mealSchema>;
