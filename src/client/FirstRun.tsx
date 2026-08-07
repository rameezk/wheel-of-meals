import { useId, useState, type FormEvent } from "react";
import { mealNameMaxLength, type Meal } from "../shared/meal";
import type { Slug } from "../shared/slug";
import { messageFor } from "./api";
import type { Households } from "./households";
import { householdsOverHttp } from "./households-over-http";
import { mealsHeld } from "./meals";
import { mealSuggestions } from "./suggestions";
import {
  alertStyle,
  fieldStyle,
  loudButtonStyle,
  quietButtonStyle,
  rowStyle,
  settledRowStyle,
} from "./styles";

type FirstRunProps = {
  slug: Slug;
  meals: Meal[];
  onChange: (meals: Meal[]) => void;
  onSpin: () => void;
  onSkip: () => void;
  households?: Households;
};

const suggestionStyle = `${quietButtonStyle} gap-1.5 hover:text-emerald-200 disabled:opacity-50`;

export const FirstRun = ({
  slug,
  meals,
  onChange,
  onSpin,
  onSkip,
  households = householdsOverHttp,
}: FirstRunProps) => {
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const nameField = useId();

  const held = new Set(meals.map((meal) => meal.name.toLowerCase()));
  const untaken = mealSuggestions.filter(
    (name) => !held.has(name.toLowerCase()),
  );

  const take = async (name: string) => {
    setWorking(true);
    setProblem(null);
    try {
      onChange([
        ...meals,
        await households.addMeal(slug, { name, description: "" }),
      ]);
      return true;
    } catch (error) {
      setProblem(messageFor(error));
      return false;
    } finally {
      setWorking(false);
    }
  };

  const addTyped = async (event: FormEvent) => {
    event.preventDefault();
    if (typed.trim().length === 0) return;
    if (await take(typed)) setTyped("");
  };

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h3 className="text-xl font-semibold text-stone-100">
          What do you cook often?
        </h3>
        <p className="text-sm text-balance text-stone-400">
          A Week is drawn from these. Tap the ones you cook, add your own, and
          change any of it later.
        </p>
      </div>

      {untaken.length > 0 && (
        <ul
          aria-label="Suggestions"
          className="flex flex-wrap justify-center gap-2"
        >
          {untaken.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => void take(name)}
                disabled={working}
                aria-label={`Add ${name}`}
                className={suggestionStyle}
              >
                <span aria-hidden className="text-emerald-400">
                  +
                </span>
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(event) => void addTyped(event)}
        className="flex flex-col gap-3"
      >
        <label htmlFor={nameField} className="text-sm text-stone-400">
          Or add your own
        </label>
        <div className="flex gap-2">
          <input
            id={nameField}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Butter chicken"
            maxLength={mealNameMaxLength}
            className={`${fieldStyle} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={working || typed.trim().length === 0}
            className={`${loudButtonStyle} shrink-0 px-6 py-3 font-medium disabled:opacity-50`}
          >
            Add
          </button>
        </div>
      </form>

      {problem && (
        <p role="alert" className={alertStyle}>
          {problem}
        </p>
      )}

      {meals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-stone-400"
          >
            {mealsHeld(meals.length)} in the Meal Bank
          </p>
          <ul aria-label="In the Meal Bank" className="flex flex-col gap-2">
            {meals.map((meal) => (
              <li
                key={meal.id}
                className={`${rowStyle} ${settledRowStyle} font-medium break-words text-stone-100`}
              >
                {meal.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onSpin}
          disabled={meals.length === 0}
          className={`${loudButtonStyle} w-full px-6 py-4 text-lg font-semibold disabled:opacity-50`}
        >
          Spin the Week
        </button>
        <button type="button" onClick={onSkip} className={quietButtonStyle}>
          Skip for now
        </button>
      </div>
    </section>
  );
};
