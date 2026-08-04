import { useEffect, useState } from "react";
import { failure, notFound } from "../shared/api";
import type { CookingDay, Household } from "../shared/household";
import type { Slug } from "../shared/slug";
import { fetchHousehold } from "./api";
import { AppShell } from "./AppShell";

type Lookup =
  | { state: "looking" }
  | { state: "found"; household: Household }
  | { state: "missing" }
  | { state: "failed" };

const dayLabels: Record<CookingDay, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

const CookingDays = ({ days }: { days: CookingDay[] }) => (
  <ul className="flex flex-wrap justify-center gap-2">
    {days.map((day) => (
      <li
        key={day}
        className="rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-300"
      >
        {dayLabels[day]}
      </li>
    ))}
  </ul>
);

export const HouseholdPage = ({ slug }: { slug: Slug }) => {
  const [lookup, setLookup] = useState<Lookup>({ state: "looking" });

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

  return (
    <AppShell>
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <p className="rounded-full border border-stone-800 bg-stone-900 px-5 py-2 font-medium break-words text-emerald-300">
          {household.slug}
        </p>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-sm tracking-wide text-stone-500 uppercase">
            Cooking Days
          </h2>
          <CookingDays days={household.cookingDays} />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-sm tracking-wide text-stone-500 uppercase">
            Meal Bank
          </h2>
          <p className="text-stone-400">
            {household.mealBank.length === 0
              ? "No meals yet."
              : `${household.mealBank.length} meals.`}
          </p>
        </div>
      </div>
    </AppShell>
  );
};
