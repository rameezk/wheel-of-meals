import { useState } from "react";
import { daysOfTheWeek, type CookingDay } from "../shared/household";
import type { Meal } from "../shared/meal";
import { respin, spareMeals, spin, type Week } from "../shared/week";
import { dayLabels } from "./days";
import { flipStaggerMillis } from "./motion";
import { ShareButton } from "./Share";
import { weekAsText } from "./sharing";
import { loudButtonStyle } from "./styles";
import { TheWheel } from "./Wheel";

const nameStyle = "min-w-0 text-right break-words text-stone-100";

const descriptionButtonStyle = `${nameStyle} cursor-pointer underline decoration-stone-600 decoration-dotted underline-offset-4 transition hover:decoration-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400`;

const respinButtonStyle =
  "-my-1.5 flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full border border-stone-800 text-lg text-stone-400 transition hover:border-stone-600 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:border-stone-800/60 disabled:text-stone-600 disabled:hover:border-stone-800/60 disabled:hover:text-stone-600";

type TheWeekProps = {
  cookingDays: CookingDay[];
  mealBank: Meal[];
  spinOnArrival?: boolean;
};

const drawnOn = (week: Week | null, day: CookingDay) =>
  week?.find((drawn) => drawn.day === day)?.meal ?? null;

const noSparesReason = "no-spare-meals";

const readOutDay = ({ day, meal }: Week[number]) =>
  `${dayLabels[day]}: ${meal?.name ?? "no Meal"}`;

const readOut = (week: Week) => week.map(readOutDay).join(", ");

const DrawnMeal = ({ meal }: { meal: Meal }) => {
  const [open, setOpen] = useState(false);

  if (!meal.description) return <span className={nameStyle}>{meal.name}</span>;

  return (
    <span className="flex min-w-0 flex-col items-end gap-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
        className={descriptionButtonStyle}
      >
        {meal.name}
        <span className="sr-only">, description</span>
      </button>

      {open && (
        <span className="text-right text-sm break-words text-stone-400">
          {meal.description}
        </span>
      )}
    </span>
  );
};

export const TheWeek = ({
  cookingDays,
  mealBank,
  spinOnArrival = false,
}: TheWeekProps) => {
  const [week, setWeek] = useState<Week | null>(null);
  const [landing, setLanding] = useState<Week | null>(() =>
    spinOnArrival && mealBank.length > 0
      ? spin(mealBank, cookingDays, Math.random)
      : null,
  );
  const [spun, setSpun] = useState(0);
  const [respun, setRespun] = useState<Partial<Record<CookingDay, number>>>({});
  const [said, setSaid] = useState("");

  const land = (drawn: Week) => {
    setLanding(null);
    setWeek(drawn);
    setSpun((count) => count + 1);
    setRespun({});
    setSaid(readOut(drawn));
  };

  const spinTheWeek = () => {
    setLanding(spin(mealBank, cookingDays, Math.random));
  };

  const respinTheDay = (day: CookingDay) => {
    if (!week) return;
    const respunWeek = respin(week, day, mealBank, Math.random);

    setWeek(respunWeek);
    setRespun((counts) => ({ ...counts, [day]: (counts[day] ?? 0) + 1 }));
    setSaid(readOutDay({ day, meal: drawnOn(respunWeek, day) }));
  };

  const flips = spun > 0;
  const noSpares = week !== null && spareMeals(week, mealBank).length === 0;

  return (
    <section className="flex w-full flex-col gap-5">
      <h3 className="sr-only">The Week</h3>

      {mealBank.length === 0 ? (
        <p className="text-center text-stone-400">
          Add a Meal to the Meal Bank, then you can spin a Week.
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
                key={`${day}-${spun}-${respun[day] ?? 0}`}
                style={
                  flips
                    ? {
                        animationDelay: respun[day]
                          ? "0ms"
                          : `${place * flipStaggerMillis}ms`,
                      }
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
                  <span className="flex min-w-0 items-baseline justify-end gap-3">
                    {meal ? (
                      <DrawnMeal meal={meal} />
                    ) : (
                      <span className={nameStyle}>
                        {week && (
                          <span className="text-stone-600">
                            <span aria-hidden>-</span>
                            <span className="sr-only">No Meal</span>
                          </span>
                        )}
                      </span>
                    )}

                    {week && (
                      <button
                        type="button"
                        onClick={() => respinTheDay(day)}
                        disabled={noSpares}
                        aria-describedby={noSpares ? noSparesReason : undefined}
                        title={`Re-spin ${dayLabels[day]}`}
                        className={respinButtonStyle}
                      >
                        <span className="sr-only">
                          Re-spin {dayLabels[day]}
                        </span>
                        <span aria-hidden>↻</span>
                      </button>
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
        {landing ? "Spinning the Week…" : said}
      </p>

      {!landing && week?.some(({ meal }) => meal === null) ? (
        <p id={noSparesReason} className="text-center text-sm text-stone-400">
          The Meal Bank ran out before the week did. Open the Meal Bank and add
          a few more.
        </p>
      ) : (
        !landing &&
        noSpares && (
          <p id={noSparesReason} className="text-center text-sm text-stone-400">
            Every Meal is already in the Week. Add another in the Meal Bank to
            re-spin a day.
          </p>
        )
      )}

      {week && !landing && (
        <ShareButton
          key={weekAsText(week)}
          label="Share the Week"
          shareable={{ title: "The Week", text: weekAsText(week) }}
        />
      )}
    </section>
  );
};
