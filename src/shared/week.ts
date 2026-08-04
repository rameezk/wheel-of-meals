import { daysOfTheWeek, type CookingDay } from "./household";
import type { Meal } from "./meal";

export type Random = () => number;

export type Week = {
  day: CookingDay;
  meal: Meal | null;
}[];

export const spin = (
  mealBank: Meal[],
  cookingDays: CookingDay[],
  random: Random,
): Week => {
  const undrawn = [...mealBank];

  const take = () =>
    undrawn.splice(Math.floor(random() * undrawn.length), 1)[0] ?? null;

  return daysOfTheWeek
    .filter((day) => cookingDays.includes(day))
    .map((day) => ({ day, meal: take() }));
};
