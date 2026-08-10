import { useId, useState, type FormEvent } from "react";
import type { Meal } from "../shared/meal";
import {
  ingredientsMaxLength,
  methodMaxLength,
  readRecipe,
  sourceMaxLength,
} from "../shared/recipe";
import type { RecipeDraft } from "./households";
import {
  alertStyle,
  fieldStyle,
  loudButtonStyle,
  quietButtonStyle,
  reallyButtonStyle,
} from "./styles";

type TheRecipeProps = {
  meal: Meal;
  headingId: string;
  working: boolean;
  problem: string | null;
  onSave: (draft: RecipeDraft) => void;
  onCancel: () => void;
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

export const TheRecipe = ({
  meal,
  headingId,
  working,
  problem,
  onSave,
  onCancel,
}: TheRecipeProps) => {
  const [draft, setDraft] = useState<RecipeDraft>({
    source: meal.recipe?.source ?? "",
    ingredients: meal.recipe?.ingredients ?? "",
    method: meal.recipe?.method ?? "",
  });
  const [asking, setAsking] = useState(false);
  const sourceField = useId();
  const ingredientsField = useId();
  const methodField = useId();

  const change = (part: Partial<RecipeDraft>) => {
    setAsking(false);
    setDraft({ ...draft, ...part });
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (meal.recipe && emptied(draft)) {
      setAsking(true);
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
            {removesTheRecipe}
          </p>
        )}

        <div className="flex gap-2">
          {asking ? (
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
                onClick={() => setAsking(false)}
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
                onClick={onCancel}
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
