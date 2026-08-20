import type { Meal } from "../shared/meal";
import { ShareButton } from "./Share";
import { recipeAsShareable } from "./sharing";
import { loudButtonStyle, quietButtonStyle } from "./styles";

type ReadMealProps = {
  meal: Meal;
  headingId: string;
  onEdit: () => void;
  onClose: () => void;
};

const sourceLinkStyle =
  "self-start break-all text-sm text-emerald-300 underline decoration-emerald-500/50 underline-offset-4 transition hover:decoration-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

const sectionLabelStyle =
  "text-sm font-medium tracking-wide text-stone-400 uppercase";

const proseStyle = "text-base whitespace-pre-wrap text-stone-200";

export const nothingWrittenYet =
  "Nothing is written here yet. Edit to add a description or a Recipe.";

export const ReadMeal = ({
  meal,
  headingId,
  onEdit,
  onClose,
}: ReadMealProps) => {
  const bare = !meal.description && !meal.recipe;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
        <h3
          id={headingId}
          className="text-lg font-semibold break-words text-stone-100"
        >
          {meal.name}
        </h3>

        {meal.description && <p className={proseStyle}>{meal.description}</p>}

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

        {meal.recipe?.ingredients && (
          <section className="flex flex-col gap-1.5">
            <h4 className={sectionLabelStyle}>Ingredients</h4>
            <p className={proseStyle}>{meal.recipe.ingredients}</p>
          </section>
        )}

        {meal.recipe?.method && (
          <section className="flex flex-col gap-1.5">
            <h4 className={sectionLabelStyle}>Method</h4>
            <p className={proseStyle}>{meal.recipe.method}</p>
          </section>
        )}

        {bare && <p className="text-stone-400">{nothingWrittenYet}</p>}
      </div>

      <div className="flex shrink-0 items-start gap-2">
        <button
          type="button"
          autoFocus
          onClick={onEdit}
          className={`${loudButtonStyle} flex min-h-11 items-center px-5 text-sm font-medium`}
        >
          Edit
        </button>
        <button type="button" onClick={onClose} className={quietButtonStyle}>
          Close
        </button>

        {meal.recipe && (
          <ShareButton
            label="Share the Recipe"
            shareable={recipeAsShareable(meal.name, meal.recipe)}
          />
        )}
      </div>
    </div>
  );
};
