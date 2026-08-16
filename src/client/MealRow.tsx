import type { Meal } from "../shared/meal";
import { RecipeMarker } from "./RecipeMarker";
import {
  openableTextStyle,
  quietButtonStyle,
  reallyButtonStyle,
} from "./styles";

const rowTextStyle =
  "group flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

const nameStyle = `${openableTextStyle} font-medium break-words text-stone-100 group-hover:decoration-stone-400`;

type MealRowProps = {
  meal: Meal;
  confirming: boolean;
  onOpen: () => void;
  onAskToDelete: () => void;
  onDelete: () => void;
  onKeep: () => void;
};

export const MealRow = ({
  meal,
  confirming,
  onOpen,
  onAskToDelete,
  onDelete,
  onKeep,
}: MealRowProps) => (
  <div className="flex items-start justify-between gap-3">
    <button type="button" onClick={onOpen} className={rowTextStyle}>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className={nameStyle}>{meal.name}</span>
        {meal.recipe && <RecipeMarker recipe={meal.recipe} />}
      </span>
      {meal.description && (
        <span className="text-sm break-words text-stone-400">
          {meal.description}
        </span>
      )}
    </button>
    <div className="flex shrink-0 gap-2">
      {confirming ? (
        <>
          <button
            type="button"
            aria-label={`Yes, delete ${meal.name}`}
            onClick={onDelete}
            className={`${reallyButtonStyle} flex min-h-11 items-center px-4 text-sm font-medium`}
          >
            Really?
          </button>
          <button
            type="button"
            aria-label={`Keep ${meal.name}`}
            onClick={onKeep}
            className={quietButtonStyle}
          >
            Keep
          </button>
        </>
      ) : (
        <button
          type="button"
          aria-label={`Delete ${meal.name}`}
          onClick={onAskToDelete}
          className={quietButtonStyle}
        >
          Delete
        </button>
      )}
    </div>
  </div>
);
