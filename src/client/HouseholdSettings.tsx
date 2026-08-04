import { useState, type FormEvent } from "react";
import { failure } from "../shared/api";
import {
  daysOfTheWeek,
  householdNameMaxLength,
  noCookingDays,
  type CookingDay,
  type Household,
  type UpdateHousehold,
} from "../shared/household";
import { Refusal, updateHousehold } from "./api";
import { dayLabels } from "./days";
import { alertStyle, fieldStyle, quietButtonStyle } from "./styles";

const sameDays = (one: CookingDay[], other: CookingDay[]) =>
  one.length === other.length && one.every((day) => other.includes(day));

type HouseholdSettingsProps = {
  household: Household;
  onChange: (household: Household) => void;
  onDone: () => void;
};

export const HouseholdSettings = ({
  household,
  onChange,
  onDone,
}: HouseholdSettingsProps) => {
  const [name, setName] = useState(household.name ?? "");
  const [days, setDays] = useState<CookingDay[]>(household.cookingDays);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (day: CookingDay) =>
    setDays((chosen) =>
      chosen.includes(day)
        ? chosen.filter((held) => held !== day)
        : daysOfTheWeek.filter((held) => held === day || chosen.includes(held)),
    );

  const changes = (): UpdateHousehold => {
    const wanted = name.trim().length === 0 ? null : name.trim();
    return {
      ...(wanted === household.name ? {} : { name: wanted }),
      ...(sameDays(days, household.cookingDays) ? {} : { cookingDays: days }),
    };
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (days.length === 0) return;

    const wanted = changes();
    if (Object.keys(wanted).length === 0) {
      onDone();
      return;
    }

    setSaving(true);
    setProblem(null);
    try {
      onChange(await updateHousehold(household.slug, wanted));
      onDone();
    } catch (error) {
      setProblem(error instanceof Refusal ? error.message : failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void save(event)}
      className="flex w-full flex-col gap-6"
    >
      <h3 className="text-sm tracking-wide text-stone-500 uppercase">
        Settings
      </h3>

      <label className="flex flex-col gap-1.5 text-sm text-stone-400">
        Household name (optional)
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={household.slug}
          maxLength={householdNameMaxLength}
          className={fieldStyle}
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm tracking-wide text-stone-500 uppercase">
          Cooking Days
        </legend>
        <div className="flex flex-wrap gap-2">
          {daysOfTheWeek.map((day) => {
            const cooking = days.includes(day);
            return (
              <label
                key={day}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-400 ${
                  cooking
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-stone-700 bg-stone-900 text-stone-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={cooking}
                  onChange={() => toggle(day)}
                  className="sr-only"
                />
                {dayLabels[day]}
              </label>
            );
          })}
        </div>
        {days.length === 0 && (
          <p role="alert" className="text-sm text-amber-200">
            {noCookingDays}
          </p>
        )}
      </fieldset>

      {problem && (
        <p role="alert" className={alertStyle}>
          {problem}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || days.length === 0}
          className="flex min-h-11 items-center rounded-full bg-emerald-500 px-6 text-sm font-medium text-stone-950 transition hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={onDone} className={quietButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
};
