import { useEffect, useId, useState, type FormEvent } from "react";
import type { Meal } from "../shared/meal";
import { named, narrowedTo, shownBy } from "./meals";
import { landedHighlightMillis } from "./motion";
import type { MealDraft, WholeMeal } from "./households";
import type { OpenHousehold } from "./open-household";
import { forgetDraft } from "./meal-drafts";
import { MealFields } from "./MealFields";
import { MealRow } from "./MealRow";
import { MealSheet } from "./MealSheet";
import { BackIcon } from "./Icons";
import {
  alertStyle,
  fieldStyle,
  landedRowStyle,
  loudButtonStyle,
  rowStyle,
  settledRowStyle,
} from "./styles";

type MealBankProps = {
  openHousehold: OpenHousehold;
  onBack: () => void;
};

type Opened = { id: string; to: "sheet" | "confirming" };

const byName = (one: Meal, other: Meal) =>
  one.name.localeCompare(other.name, undefined, { sensitivity: "base" });

const backButtonStyle =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-700 text-lg text-stone-300 transition hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

export const MealBank = ({ openHousehold, onBack }: MealBankProps) => {
  const { household, working, problem } = openHousehold;
  const meals = household.mealBank;
  const [draft, setDraft] = useState<MealDraft>({ name: "", description: "" });
  const [filter, setFilter] = useState("");
  const [opened, setOpened] = useState<Opened | null>(null);
  const [justLanded, setJustLanded] = useState<string | null>(null);
  const filterField = useId();

  useEffect(() => {
    if (!justLanded) return;

    const settle = setTimeout(() => setJustLanded(null), landedHighlightMillis);
    return () => clearTimeout(settle);
  }, [justLanded]);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!named(draft)) return;

    const added = await openHousehold.addMeal(draft);
    if (!added) return;

    setDraft({ name: "", description: "" });
    setJustLanded(added.id);
    if (!shownBy(added, filter)) setFilter("");
  };

  const saveMeal = async (meal: Meal, draft: WholeMeal) => {
    const saved = await openHousehold.saveMeal(meal.id, draft);
    if (saved) forgetDraft(meal.id);
    return saved;
  };

  const remove = async (meal: Meal) => {
    setOpened(null);
    if (await openHousehold.removeMeal(meal.id)) forgetDraft(meal.id);
  };

  const open = (meal: Meal, to: Opened["to"]) => {
    openHousehold.dismiss();
    setOpened({ id: meal.id, to });
  };

  const narrow = (wanted: string) => {
    setFilter(wanted);
    setOpened(null);
  };

  const { shown, count } = narrowedTo(meals, filter);
  const landed = meals.find((meal) => meal.id === justLanded);
  const editing =
    opened?.to === "sheet"
      ? (meals.find((meal) => meal.id === opened.id) ?? null)
      : null;

  return (
    <section className="flex w-full flex-col gap-5">
      <h3 className="sr-only">Meal Bank</h3>

      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-900 bg-stone-950 py-3">
        <button
          type="button"
          onClick={onBack}
          className={backButtonStyle}
          title="Back to the Household"
        >
          <span className="sr-only">Back to the Household</span>
          <BackIcon />
        </button>

        <label className="sr-only" htmlFor={filterField}>
          Filter
        </label>
        <input
          id={filterField}
          value={filter}
          onChange={(event) => narrow(event.target.value)}
          placeholder="Filter by name"
          className={`${fieldStyle} min-w-0 flex-1 py-2.5`}
        />

        <p className="shrink-0 text-sm whitespace-nowrap text-stone-400">
          {count}
        </p>
      </div>

      <form
        onSubmit={(event) => void add(event)}
        className="flex flex-col gap-3"
      >
        <MealFields
          nameLabel="Meal"
          descriptionLabel="Description (optional)"
          draft={draft}
          onChange={setDraft}
        />
        <button
          type="submit"
          disabled={working || !named(draft)}
          className={`${loudButtonStyle} px-6 py-3 font-medium disabled:opacity-50`}
        >
          Add
        </button>
      </form>

      {problem && !editing && (
        <p role="alert" className={alertStyle}>
          {problem}
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {landed ? `${landed.name} added` : ""}
      </p>

      {meals.length === 0 ? (
        <p className="text-stone-400">
          No Meals yet. Add the ones you cook often.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-stone-400">
          No Meal matches “{filter.trim()}”. The rest of the Bank is still here
          - clear the filter to see it.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...shown].sort(byName).map((meal) => (
            <li
              key={meal.id}
              className={`${rowStyle} ${
                meal.id === justLanded ? landedRowStyle : settledRowStyle
              }`}
            >
              <MealRow
                meal={meal}
                confirming={
                  opened?.id === meal.id && opened.to === "confirming"
                }
                onOpen={() => open(meal, "sheet")}
                onAskToDelete={() => open(meal, "confirming")}
                onDelete={() => void remove(meal)}
                onKeep={() => setOpened(null)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <MealSheet
          meal={editing}
          working={working}
          problem={problem}
          onSave={(draft) => saveMeal(editing, draft)}
          onClose={() => setOpened(null)}
        />
      )}
    </section>
  );
};
