import { useEffect, useState } from "react";
import { failure, notFound } from "../shared/api";
import { type Household } from "../shared/household";
import type { Slug } from "../shared/slug";
import { fetchHousehold } from "./api";
import { AppShell } from "./AppShell";
import { HouseholdSettings } from "./HouseholdSettings";
import { MealBank } from "./MealBank";
import { forget, remember } from "./remembered";
import type { View } from "./route";
import { ShareButton } from "./Share";
import { householdLink } from "./sharing";
import { quietButtonStyle } from "./styles";
import { TheWeek } from "./Week";

type Lookup =
  | { state: "looking" }
  | { state: "found"; household: Household }
  | { state: "missing" }
  | { state: "failed" };

type HouseholdPageProps = {
  slug: Slug;
  view: View;
  onGo: (path: string) => void;
};

export const HouseholdPage = ({ slug, view, onGo }: HouseholdPageProps) => {
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

  const { state } = lookup;
  const name = lookup.state === "found" ? lookup.household.name : null;

  useEffect(() => {
    if (state === "found") remember({ slug, name });
    else if (state === "missing") forget(slug);
  }, [state, name, slug]);

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

        {view === "settings" ? (
          <HouseholdSettings
            household={household}
            onChange={show}
            onDone={() => onGo(`/${household.slug}`)}
          />
        ) : (
          <>
            <TheWeek
              cookingDays={household.cookingDays}
              mealBank={household.mealBank}
            />

            <div className="flex items-start gap-2">
              <ShareButton
                label="Share the Household"
                shareable={{
                  title: household.name ?? household.slug,
                  url: householdLink(household.slug),
                }}
              />

              <button
                type="button"
                onClick={() => onGo(`/${household.slug}/settings`)}
                className={quietButtonStyle}
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
