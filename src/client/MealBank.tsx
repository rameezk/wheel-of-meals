import { useEffect, useId, useState, type FormEvent } from "react";
import {
  mealDescriptionMaxLength,
  mealNameMaxLength,
  type Meal,
} from "../shared/meal";
import type { Slug } from "../shared/slug";
import { narrowedTo, shownBy } from "./meals";
import { landedHighlightMillis } from "./motion";
import { messageFor, type MealDraft } from "./api";
import type { Households } from "./households";
import {
  alertStyle,
  fieldStyle,
  landedRowStyle,
  loudButtonStyle,
  quietButtonStyle,
  rowStyle,
  settledRowStyle,
} from "./styles";

type MealBankProps = {
  slug: Slug;
  meals: Meal[];
  onChange: (meals: Meal[]) => void;
  onBack: () => void;
  households: Households;
};

const byName = (one: Meal, other: Meal) =>
  one.name.localeCompare(other.name, undefined, { sensitivity: "base" });

const backButtonStyle =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-700 text-lg text-stone-300 transition hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

const MealFields = ({
  nameLabel,
  descriptionLabel,
  draft,
  onChange,
  focusName = false,
}: {
  nameLabel: string;
  descriptionLabel: string;
  draft: MealDraft;
  onChange: (draft: MealDraft) => void;
  focusName?: boolean;
}) => (
  <>
    <label className="flex flex-col gap-1.5 text-sm text-stone-400">
      {nameLabel}
      <input
        value={draft.name}
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
        placeholder="Butter chicken"
        maxLength={mealNameMaxLength}
        autoFocus={focusName}
        className={fieldStyle}
      />
    </label>
    <label className="flex flex-col gap-1.5 text-sm text-stone-400">
      {descriptionLabel}
      <input
        value={draft.description}
        onChange={(event) =>
          onChange({ ...draft, description: event.target.value })
        }
        placeholder="The one with the coconut milk"
        maxLength={mealDescriptionMaxLength}
        className={fieldStyle}
      />
    </label>
  </>
);

const named = (draft: MealDraft) => draft.name.trim().length > 0;

const MealForm = ({
  meal,
  onSave,
  onCancel,
}: {
  meal: Meal;
  onSave: (draft: MealDraft) => void;
  onCancel: () => void;
}) => {
  const [draft, setDraft] = useState<MealDraft>({
    name: meal.name,
    description: meal.description ?? "",
  });

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (named(draft)) onSave(draft);
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <MealFields
        nameLabel="Name"
        descriptionLabel="Description"
        draft={draft}
        onChange={setDraft}
        focusName
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className={`${loudButtonStyle} flex min-h-11 items-center px-5 text-sm font-medium`}
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className={quietButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export const MealBank = ({
  slug,
  meals,
  onChange,
  onBack,
  households,
}: MealBankProps) => {
  const [draft, setDraft] = useState<MealDraft>({ name: "", description: "" });
  const [filter, setFilter] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [justLanded, setJustLanded] = useState<string | null>(null);
  const filterField = useId();

  useEffect(() => {
    if (!justLanded) return;

    const settle = setTimeout(() => setJustLanded(null), landedHighlightMillis);
    return () => clearTimeout(settle);
  }, [justLanded]);

  const attempt = async <Changed,>(
    change: () => Promise<{ meals: Meal[]; changed: Changed }>,
  ) => {
    setWorking(true);
    setProblem(null);
    try {
      const outcome = await change();
      onChange(outcome.meals);
      return outcome;
    } catch (error) {
      setProblem(messageFor(error));
      return null;
    } finally {
      setWorking(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!named(draft)) return;

    const outcome = await attempt(async () => {
      const added = await households.addMeal(slug, draft);
      return { meals: [...meals, added], changed: added };
    });

    if (!outcome) return;

    setDraft({ name: "", description: "" });
    setJustLanded(outcome.changed.id);
    if (!shownBy(outcome.changed, filter)) setFilter("");
  };

  const save = async (meal: Meal, draft: MealDraft) => {
    const outcome = await attempt(async () => {
      const edited = await households.editMeal(slug, meal.id, draft);
      return {
        meals: meals.map((held) => (held.id === edited.id ? edited : held)),
        changed: edited,
      };
    });

    if (outcome) setEditing(null);
  };

  const remove = async (meal: Meal) => {
    setConfirming(null);
    await attempt(async () => {
      await households.removeMeal(slug, meal.id);
      return {
        meals: meals.filter((held) => held.id !== meal.id),
        changed: meal,
      };
    });
  };

  const narrow = (wanted: string) => {
    setFilter(wanted);
    setEditing(null);
    setConfirming(null);
  };

  const { shown, count } = narrowedTo(meals, filter);
  const landed = meals.find((meal) => meal.id === justLanded);

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
          <span aria-hidden>←</span>
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

      {problem && (
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
              {editing === meal.id ? (
                <MealForm
                  meal={meal}
                  onSave={(draft) => void save(meal, draft)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium break-words text-stone-100">
                      {meal.name}
                    </span>
                    {meal.description && (
                      <span className="text-sm break-words text-stone-400">
                        {meal.description}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {confirming === meal.id ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Yes, delete ${meal.name}`}
                          onClick={() => void remove(meal)}
                          className="flex min-h-11 items-center rounded-full bg-rose-500 px-4 text-sm font-medium text-stone-950 transition hover:bg-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                        >
                          Really?
                        </button>
                        <button
                          type="button"
                          aria-label={`Keep ${meal.name}`}
                          onClick={() => setConfirming(null)}
                          className={quietButtonStyle}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-label={`Edit ${meal.name}`}
                          onClick={() => {
                            setProblem(null);
                            setConfirming(null);
                            setEditing(meal.id);
                          }}
                          className={quietButtonStyle}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${meal.name}`}
                          onClick={() => {
                            setProblem(null);
                            setEditing(null);
                            setConfirming(meal.id);
                          }}
                          className={quietButtonStyle}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
