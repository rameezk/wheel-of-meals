import { useId, type FormEvent } from "react";
import type { Meal } from "../shared/meal";
import {
  ingredientsMaxLength,
  methodMaxLength,
  readRecipe,
  sourceMaxLength,
} from "../shared/recipe";
import type { RecipeDraft } from "./households";
import type { RecipeWriting } from "./recipe-writing";
import { ShareButton } from "./Share";
import { recipeAsShareable } from "./sharing";
import {
  alertStyle,
  fieldStyle,
  loudButtonStyle,
  noticeStyle,
  quietButtonStyle,
  reallyButtonStyle,
} from "./styles";

type TheRecipeProps = {
  meal: Meal;
  headingId: string;
  working: boolean;
  problem: string | null;
  writing: RecipeWriting;
  onSave: (draft: RecipeDraft) => void;
};

const sourceLinkStyle =
  "self-start break-all text-sm text-emerald-300 underline decoration-emerald-500/50 underline-offset-4 transition hover:decoration-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

const labelStyle = "flex flex-col gap-1.5 text-sm text-stone-400";

const ingredientsPlaceholder = "1 onion, chopped\n2 tbsp butter\n400g tomatoes";

const methodPlaceholder =
  "Fry the paste for two minutes longer than the page says.";

const emptied = (draft: RecipeDraft) => {
  const read = readRecipe(draft);
  return "recipe" in read && read.recipe === null;
};

export const removesTheRecipe =
  "Saving this empties the Recipe, which removes it.";

export const discardsTheWriting =
  "Closing this throws away what has not been saved.";

export const unsavedFromBefore =
  "You wrote this last time and did not save it. Save it to keep it, or discard it.";

export const TheRecipe = ({
  meal,
  headingId,
  working,
  problem,
  writing,
  onSave,
}: TheRecipeProps) => {
  const { draft, asking, change } = writing;
  const sourceField = useId();
  const ingredientsField = useId();
  const methodField = useId();

  const save = (event: FormEvent) => {
    event.preventDefault();
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
          <span className="text-emerald-300">Recipe</span> for {meal.name}
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

        <label className={labelStyle} htmlFor={sourceField}>
          Source (optional)
          <input
            id={sourceField}
            value={draft.source}
            onChange={(event) => change({ source: event.target.value })}
            inputMode="url"
            placeholder="recipes.example.com/butter-chicken"
            maxLength={sourceMaxLength}
            autoFocus
            className={fieldStyle}
          />
        </label>

        {meal.recipe?.source && (
          <a
            href={meal.recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className={sourceLinkStyle}
          >
            {meal.recipe.source}
          </a>
        )}

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
                aria-label={`Keep writing the Recipe for ${meal.name}`}
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
                disabled={working}
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

          {meal.recipe && (
            <ShareButton
              label="Share the Recipe"
              shareable={recipeAsShareable(meal.name, meal.recipe)}
            />
          )}
        </div>
      </div>
    </form>
  );
};
