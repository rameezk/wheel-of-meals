import type { Meal } from "../shared/meal";

export const mealsHeld = (held: number) =>
  `${held} ${held === 1 ? "Meal" : "Meals"}`;

export const whatTheBankHolds = (held: number) =>
  held === 0
    ? "No Meals yet - add the ones you cook often"
    : `${mealsHeld(held)} to draw from`;

export const shownBy = (meal: Meal, filter: string) =>
  meal.name.toLowerCase().includes(filter.trim().toLowerCase());

export const narrowedTo = (meals: Meal[], filter: string) => {
  if (filter.trim().length === 0)
    return { shown: meals, count: mealsHeld(meals.length) };

  const shown = meals.filter((meal) => shownBy(meal, filter));
  return { shown, count: `${shown.length} of ${mealsHeld(meals.length)}` };
};
