import { useId, type FormEvent } from "react";
import type { Meal } from "../shared/meal";
import {
  ingredientsMaxLength,
  methodMaxLength,
  readRecipe,
  sourceMaxLength,
} from "../shared/recipe";
import type { WholeMeal } from "./households";
import { MealFields } from "./MealFields";
import { named } from "./meals";
import type { MealWriting } from "./meal-writing";
import {
  alertStyle,
  fieldStyle,
  loudButtonStyle,
  noticeStyle,
  quietButtonStyle,
  reallyButtonStyle,
} from "./styles";

type TheMealProps = {
  meal: Meal;
  headingId: string;
  working: boolean;
  problem: string | null;
  writing: MealWriting;
  onSave: (draft: WholeMeal) => void;
};

const labelStyle = "flex flex-col gap-1.5 text-sm text-stone-400";

const ingredientsPlaceholder = "1 onion, chopped\n2 tbsp butter\n400g tomatoes";

const methodPlaceholder =
  "Fry the paste for two minutes longer than the page says.";

const emptied = (draft: WholeMeal) => {
  const read = readRecipe(draft);
  return "recipe" in read && read.recipe === null;
};

export const removesTheRecipe =
  "Saving this empties the Recipe, which removes it.";

export const discardsTheWriting =
  "Closing this throws away what has not been saved.";

export const unsavedFromBefore =
  "You wrote this last time and did not save it. Save it to keep it, or discard it.";

export const TheMeal = ({
  meal,
  headingId,
  working,
  problem,
  writing,
  onSave,
}: TheMealProps) => {
  const { draft, asking, change } = writing;
  const sourceField = useId();
  const ingredientsField = useId();
  const methodField = useId();

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!named(draft)) return;

    if (meal.recipe && emptied(draft)) {
      writing.askToEmpty();
      return;
    }

    onSave(draft);
  };

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <h3
          id={headingId}
          className="text-lg font-semibold break-words text-stone-100"
        >
          {meal.name}
        </h3>

        {writing.restored && (
          <div className={`${noticeStyle} flex flex-col items-start gap-3`}>
            <p>{unsavedFromBefore}</p>
            <button
              type="button"
              aria-label={`Discard the unsaved writing for ${meal.name}`}
              onClick={writing.dropTheDraft}
              className={quietButtonStyle}
            >
              Discard
            </button>
          </div>
        )}

        <MealFields
          nameLabel="Name"
          descriptionLabel="Description (optional)"
          draft={draft}
          onChange={(next) => change(next)}
          focusName
        />

        <label className={labelStyle} htmlFor={sourceField}>
          Source (optional)
          <input
            id={sourceField}
            value={draft.source}
            onChange={(event) => change({ source: event.target.value })}
            inputMode="url"
            placeholder="recipes.example.com/butter-chicken"
            maxLength={sourceMaxLength}
            className={fieldStyle}
          />
        </label>

        <label className={labelStyle} htmlFor={ingredientsField}>
          Ingredients (optional)
          <textarea
            id={ingredientsField}
            value={draft.ingredients}
            onChange={(event) => change({ ingredients: event.target.value })}
            rows={5}
            placeholder={ingredientsPlaceholder}
            maxLength={ingredientsMaxLength}
            className={`${fieldStyle} resize-y`}
          />
        </label>

        <label className={labelStyle} htmlFor={methodField}>
          Method (optional)
          <textarea
            id={methodField}
            value={draft.method}
            onChange={(event) => change({ method: event.target.value })}
            rows={8}
            placeholder={methodPlaceholder}
            maxLength={methodMaxLength}
            className={`${fieldStyle} resize-y`}
          />
        </label>

        {problem && (
          <p role="alert" className={alertStyle}>
            {problem}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        {asking && (
          <p role="alert" className="text-sm text-stone-400">
            {asking === "emptying" ? removesTheRecipe : discardsTheWriting}
          </p>
        )}

        <div className="flex items-start gap-2">
          {asking === "emptying" ? (
            <>
              <button
                type="button"
                disabled={working}
                aria-label={`Yes, remove the Recipe for ${meal.name}`}
                onClick={() => onSave(draft)}
                className={`${reallyButtonStyle} flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-50`}
              >
                Really?
              </button>
              <button
                type="button"
                aria-label={`Keep the Recipe for ${meal.name}`}
                onClick={writing.keepWriting}
                className={quietButtonStyle}
              >
                Keep
              </button>
            </>
          ) : asking === "leaving" ? (
            <>
              <button
                type="button"
                aria-label={`Yes, discard the writing for ${meal.name}`}
                onClick={writing.leave}
                className={`${reallyButtonStyle} flex min-h-11 items-center px-5 text-sm font-medium`}
              >
                Really?
              </button>
              <button
                type="button"
                aria-label={`Keep writing ${meal.name}`}
                onClick={writing.keepWriting}
                className={quietButtonStyle}
              >
                Keep
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={working || !named(draft)}
                className={`${loudButtonStyle} flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-50`}
              >
                Save
              </button>
              <button
                type="button"
                onClick={writing.askToLeave}
                className={quietButtonStyle}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
};
