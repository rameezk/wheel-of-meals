import type { Meal } from "../shared/meal";

export const mealsHeld = (held: number) =>
  `${held} ${held === 1 ? "Meal" : "Meals"}`;

export const narrowedTo = (meals: Meal[], filter: string) => {
  const wanted = filter.trim().toLowerCase();

  if (wanted.length === 0)
    return { shown: meals, count: mealsHeld(meals.length) };

  const shown = meals.filter((meal) =>
    meal.name.toLowerCase().includes(wanted),
  );
  return { shown, count: `${shown.length} of ${mealsHeld(meals.length)}` };
};
