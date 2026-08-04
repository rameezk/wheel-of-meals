import { useEffect, useState } from "react";
import { failure, notFound } from "../shared/api";
import type { CookingDay, Household } from "../shared/household";
import type { Slug } from "../shared/slug";
import { fetchHousehold } from "./api";
import { AppShell } from "./AppShell";
import { dayLabels, week } from "./days";
import { HouseholdSettings } from "./HouseholdSettings";
import { MealBank } from "./MealBank";

type Lookup =
  | { state: "looking" }
  | { state: "found"; household: Household }
  | { state: "missing" }
  | { state: "failed" };

const CookingDays = ({ days }: { days: CookingDay[] }) => (
  <ul className="flex flex-wrap justify-center gap-2">
    {week.map((day) => {
      const cooking = days.includes(day);
      return (
        <li
          key={day}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            cooking
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-stone-900 text-stone-400"
          }`}
        >
          {dayLabels[day]}
          {!cooking && <span className="sr-only"> - not cooking</span>}
        </li>
      );
    })}
  </ul>
);

export const HouseholdPage = ({ slug }: { slug: Slug }) => {
  const [lookup, setLookup] = useState<Lookup>({ state: "looking" });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchHousehold(slug, controller.signal)
      .then((household) =>
        setLookup(
          household ? { state: "found", household } : { state: "missing" },
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ state: "failed" });
      });

    return () => controller.abort();
  }, [slug]);

  if (lookup.state === "looking") {
    return (
      <AppShell>
        <p className="text-stone-400">Opening…</p>
      </AppShell>
    );
  }

  if (lookup.state === "missing" || lookup.state === "failed") {
    return (
      <AppShell>
        <p role="alert" className="max-w-md text-center text-rose-300">
          {lookup.state === "missing" ? notFound.message : failure.message}
        </p>
        <a href="/" className="text-stone-400 underline underline-offset-4">
          Back to the start
        </a>
      </AppShell>
    );
  }

  const { household } = lookup;
  const show = (household: Household) =>
    setLookup({ state: "found", household });

  return (
    <AppShell>
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-semibold break-words text-emerald-300">
            {household.name ?? household.slug}
          </h2>

          {household.name && (
            <p className="text-sm break-words text-stone-400">
              {household.slug}
            </p>
          )}
        </div>

        {settingsOpen ? (
          <HouseholdSettings
            household={household}
            onChange={show}
            onDone={() => setSettingsOpen(false)}
          />
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-sm tracking-wide text-stone-500 uppercase">
                Cooking Days
              </h3>
              <CookingDays days={household.cookingDays} />
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex min-h-11 items-center rounded-full border border-stone-700 px-4 text-sm text-stone-300 transition hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                Settings
              </button>
            </div>

            <MealBank
              slug={household.slug}
              meals={household.mealBank}
              onChange={(mealBank) => show({ ...household, mealBank })}
            />
          </>
        )}
      </div>
    </AppShell>
  );
};
