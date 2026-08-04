import { useState, type FormEvent } from "react";
import { failure } from "../shared/api";
import {
  mealDescriptionMaxLength,
  mealNameMaxLength,
  type Meal,
} from "../shared/meal";
import type { Slug } from "../shared/slug";
import { addMeal, deleteMeal, editMeal, Refusal, type MealDraft } from "./api";
import {
  alertStyle,
  fieldStyle,
  loudButtonStyle,
  quietButtonStyle,
} from "./styles";

type MealBankProps = {
  slug: Slug;
  meals: Meal[];
  onChange: (meals: Meal[]) => void;
};

const byName = (one: Meal, other: Meal) =>
  one.name.localeCompare(other.name, undefined, { sensitivity: "base" });

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

export const MealBank = ({ slug, meals, onChange }: MealBankProps) => {
  const [draft, setDraft] = useState<MealDraft>({ name: "", description: "" });
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const attempt = async (change: () => Promise<Meal[]>) => {
    setWorking(true);
    setProblem(null);
    try {
      onChange(await change());
      return true;
    } catch (error) {
      setProblem(error instanceof Refusal ? error.message : failure.message);
      return false;
    } finally {
      setWorking(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!named(draft)) return;

    const landed = await attempt(async () => [
      ...meals,
      await addMeal(slug, draft),
    ]);

    if (landed) setDraft({ name: "", description: "" });
  };

  const save = async (meal: Meal, draft: MealDraft) => {
    const landed = await attempt(async () => {
      const edited = await editMeal(slug, meal.id, draft);
      return meals.map((held) => (held.id === edited.id ? edited : held));
    });

    if (landed) setEditing(null);
  };

  const remove = async (meal: Meal) => {
    setConfirming(null);
    await attempt(async () => {
      await deleteMeal(slug, meal.id);
      return meals.filter((held) => held.id !== meal.id);
    });
  };

  return (
    <section className="flex w-full flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm tracking-wide text-stone-500 uppercase">
          Meal Bank
        </h3>
        <p className="text-sm text-stone-400">
          {meals.length === 1 ? "1 Meal" : `${meals.length} Meals`}
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

      {meals.length === 0 ? (
        <p className="text-stone-400">
          No Meals yet. Add the ones you cook often.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...meals].sort(byName).map((meal) => (
            <li
              key={meal.id}
              className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3"
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
