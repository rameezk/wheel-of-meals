import { useState, type FormEvent } from "react";
import type { Meal } from "../shared/meal";
import type { MealDraft } from "./households";
import { named } from "./meals";
import { MealFields } from "./MealFields";
import { loudButtonStyle, openableTextStyle, quietButtonStyle } from "./styles";

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

export type RowOpenTo = "editing" | "confirming";

export const hasARecipe = "has a Recipe";

const rowTextStyle =
  "group flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

const nameStyle = `${openableTextStyle} font-medium break-words text-stone-100 group-hover:decoration-stone-400`;

type MealRowProps = {
  meal: Meal;
  openTo: RowOpenTo | null;
  onOpenRecipe: () => void;
  onEdit: () => void;
  onSave: (draft: MealDraft) => void;
  onAskToDelete: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export const MealRow = ({
  meal,
  openTo,
  onOpenRecipe,
  onEdit,
  onSave,
  onAskToDelete,
  onDelete,
  onClose,
}: MealRowProps) =>
  openTo === "editing" ? (
    <MealForm meal={meal} onSave={onSave} onCancel={onClose} />
  ) : (
    <div className="flex items-start justify-between gap-3">
      <button type="button" onClick={onOpenRecipe} className={rowTextStyle}>
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className={nameStyle}>{meal.name}</span>
          {meal.recipe && (
            <span className="shrink-0 text-sm text-emerald-300">
              <span aria-hidden>↗</span>
              <span className="sr-only">, {hasARecipe}</span>
            </span>
          )}
        </span>
        {meal.description && (
          <span className="text-sm break-words text-stone-400">
            {meal.description}
          </span>
        )}
      </button>
      <div className="flex shrink-0 gap-2">
        {openTo === "confirming" ? (
          <>
            <button
              type="button"
              aria-label={`Yes, delete ${meal.name}`}
              onClick={onDelete}
              className="flex min-h-11 items-center rounded-full bg-rose-500 px-4 text-sm font-medium text-stone-950 transition hover:bg-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            >
              Really?
            </button>
            <button
              type="button"
              aria-label={`Keep ${meal.name}`}
              onClick={onClose}
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
              onClick={onEdit}
              className={quietButtonStyle}
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`Delete ${meal.name}`}
              onClick={onAskToDelete}
              className={quietButtonStyle}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
