import { mealDescriptionMaxLength, mealNameMaxLength } from "../shared/meal";
import type { MealDraft } from "./households";
import { fieldStyle } from "./styles";

export const MealFields = ({
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
