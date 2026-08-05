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

export const spareMeals = (week: Week, mealBank: Meal[]): Meal[] =>
  mealBank.filter(
    (spare) => !week.some(({ meal }) => meal !== null && meal.id === spare.id),
  );

export const respin = (
  week: Week,
  day: CookingDay,
  mealBank: Meal[],
  random: Random,
): Week => {
  if (!week.some((drawn) => drawn.day === day)) return week;

  const spare = spareMeals(week, mealBank);
  const meal = spare[Math.floor(random() * spare.length)];
  if (!meal) return week;

  return week.map((drawn) => (drawn.day === day ? { ...drawn, meal } : drawn));
};
