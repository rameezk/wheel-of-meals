import { mealBankMaxSize } from "./meal";

export const notFound = {
  error: "not_found",
  message: "That link opens nothing here.",
} as const;

export const failure = {
  error: "failed",
  message: "Something went wrong. Try again.",
} as const;

export const duplicateMeal = {
  error: "duplicate_meal",
  message: "That Meal is already in the Meal Bank.",
} as const;

export const mealBankFull = {
  error: "meal_bank_full",
  message: `A Meal Bank holds ${mealBankMaxSize} Meals. Delete one to make room.`,
} as const;

export const invalidMeal = (message: string) =>
  ({ error: "invalid_meal", message }) as const;

export const invalidHousehold = (message: string) =>
  ({ error: "invalid_household", message }) as const;
