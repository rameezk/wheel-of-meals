import { useState } from "react";
import { daysOfTheWeek, type CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { spin, type Week } from "../shared/week";
import { dayLabels } from "./days";
import { flipStaggerMillis, useLessMotion } from "./motion";
import { loudButtonStyle } from "./styles";
import { TheWheel } from "./Wheel";

type TheWeekProps = {
  cookingDays: CookingDay[];
  mealBank: Meal[];
};

const drawnOn = (week: Week | null, day: CookingDay) =>
  week?.find((drawn) => drawn.day === day)?.meal ?? null;

const readOut = (week: Week) =>
  week
    .map(({ day, meal }) => `${dayLabels[day]}: ${meal?.name ?? "no Meal"}`)
    .join(", ");

export const TheWeek = ({ cookingDays, mealBank }: TheWeekProps) => {
  const [week, setWeek] = useState<Week | null>(null);
  const [landing, setLanding] = useState<Week | null>(null);
  const [spun, setSpun] = useState(0);
  const lessMotion = useLessMotion();

  const land = (drawn: Week) => {
    setLanding(null);
    setWeek(drawn);
    setSpun((count) => count + 1);
  };

  const spinTheWeek = () => {
    const drawn = spin(mealBank, cookingDays, Math.random);
    if (lessMotion) land(drawn);
    else setLanding(drawn);
  };

  const flips = spun > 0 && !lessMotion;

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
          onClick={landing ? () => land(landing) : spinTheWeek}
          className={`${loudButtonStyle} px-6 py-4 text-lg font-semibold`}
        >
          {landing ? "Spinning…" : week ? "Spin again" : "Spin the Week"}
        </button>
      )}

      <div className="relative">
        <ul className={`flex flex-col gap-2 ${landing ? "invisible" : ""}`}>
          {daysOfTheWeek.map((day, place) => {
            const cooking = cookingDays.includes(day);
            const meal = drawnOn(week, day);

            return (
              <li
                key={`${day}-${spun}`}
                style={
                  flips
                    ? { animationDelay: `${place * flipStaggerMillis}ms` }
                    : undefined
                }
                className={`flex items-baseline justify-between gap-3 rounded-2xl border px-4 py-3 ${
                  flips ? "card-flip " : ""
                }${
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

        {landing && (
          <TheWheel spinNumber={spun} onLanded={() => land(landing)} />
        )}
      </div>

      <p role="status" className="sr-only">
        {landing ? "Spinning the Week…" : week ? readOut(week) : ""}
      </p>

      {!landing && week?.some(({ meal }) => meal === null) && (
        <p className="text-center text-sm text-stone-400">
          The Meal Bank ran out before the week did. Add a few more Meals below.
        </p>
      )}
    </section>
  );
};
