import { useId, useState, type FormEvent } from "react";
import type { Meal } from "../shared/meal";
import { sourceMaxLength } from "../shared/recipe";
import type { RecipeDraft } from "./households";
import {
  alertStyle,
  fieldStyle,
  loudButtonStyle,
  quietButtonStyle,
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
  });
  const sourceField = useId();

  const save = (event: FormEvent) => {
    event.preventDefault();
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

        <label
          className="flex flex-col gap-1.5 text-sm text-stone-400"
          htmlFor={sourceField}
        >
          Source (optional)
          <input
            id={sourceField}
            value={draft.source}
            onChange={(event) => setDraft({ source: event.target.value })}
            inputMode="url"
            placeholder="recipes.example.com/butter-chicken"
            maxLength={sourceMaxLength}
            autoFocus
            className={fieldStyle}
          />
        </label>

        {meal.recipe && (
          <a
            href={meal.recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className={sourceLinkStyle}
          >
            {meal.recipe.source}
          </a>
        )}

        {problem && (
          <p role="alert" className={alertStyle}>
            {problem}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="submit"
          disabled={working}
          className={`${loudButtonStyle} flex min-h-11 items-center px-5 text-sm font-medium disabled:opacity-50`}
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
