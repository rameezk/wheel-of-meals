import { useState } from "react";
import { daysOfTheWeek, type CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { spin, type Week } from "../shared/week";
import { dayLabels } from "./days";
import { loudButtonStyle } from "./styles";

type TheWeekProps = {
  cookingDays: CookingDay[];
  mealBank: Meal[];
};

const drawnOn = (week: Week | null, day: CookingDay) =>
  week?.find((spun) => spun.day === day)?.meal ?? null;

export const TheWeek = ({ cookingDays, mealBank }: TheWeekProps) => {
  const [week, setWeek] = useState<Week | null>(null);

  return (
    <section className="flex w-full flex-col gap-5">
      <h3 className="sr-only">The Week</h3>

      {mealBank.length === 0 ? (
        <p className="text-center text-stone-400">
          Add a Meal below, then you can spin a Week.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setWeek(spin(mealBank, cookingDays, Math.random))}
          className={`${loudButtonStyle} px-6 py-4 text-lg font-semibold`}
        >
          {week ? "Spin again" : "Spin the Week"}
        </button>
      )}

      <ul className="flex flex-col gap-2">
        {daysOfTheWeek.map((day) => {
          const cooking = cookingDays.includes(day);
          const meal = drawnOn(week, day);

          return (
            <li
              key={day}
              className={`flex items-baseline justify-between gap-3 rounded-2xl border px-4 py-3 ${
                cooking
                  ? "border-stone-800 bg-stone-900/60"
                  : "border-stone-900 bg-stone-950"
              }`}
            >
              <span
                className={`shrink-0 text-sm font-medium ${
                  cooking ? "text-emerald-300" : "text-stone-600"
                }`}
              >
                {dayLabels[day]}
                {!cooking && <span className="sr-only"> - not cooking</span>}
              </span>

              {cooking && (
                <span className="min-w-0 text-right break-words text-stone-100">
                  {meal
                    ? meal.name
                    : week && (
                        <span className="text-stone-600">
                          <span aria-hidden>-</span>
                          <span className="sr-only">No Meal</span>
                        </span>
                      )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {week?.some(({ meal }) => meal === null) && (
        <p className="text-center text-sm text-stone-400">
          The Meal Bank ran out before the week did. Add a few more Meals below.
        </p>
      )}
    </section>
  );
};
