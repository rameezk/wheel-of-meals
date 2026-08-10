import { useState } from "react";
import { notFound } from "../shared/api";
import type { Slug } from "../shared/slug";
import { AppShell } from "./AppShell";
import { FirstRun } from "./FirstRun";
import { firstRunSkipped, skipFirstRun } from "./guiding";
import type { Households } from "./households";
import { HouseholdSettings } from "./HouseholdSettings";
import { MealBank } from "./MealBank";
import { mealsHeld } from "./meals";
import { useOpenHousehold } from "./open-household";
import type { View } from "./route";
import { ShareButton } from "./Share";
import { householdLink } from "./sharing";
import { quietButtonStyle } from "./styles";
import { TheWeek } from "./Week";

type HouseholdPageProps = {
  slug: Slug;
  view: View;
  onGo: (path: string) => void;
  households: Households;
};

export const HouseholdPage = ({
  slug,
  view,
  onGo,
  households,
}: HouseholdPageProps) => {
  const opening = useOpenHousehold(slug, households);
  const [guiding, setGuiding] = useState<boolean | null>(null);
  const [spinOnArrival, setSpinOnArrival] = useState(false);
  const [shownView, setShownView] = useState(view);

  const isOpen = opening.state === "open";

  if (shownView !== view) {
    setShownView(view);
    setGuiding(isOpen ? false : null);
    setSpinOnArrival(false);
  }

  if (!isOpen && guiding !== null) {
    setGuiding(null);
    setSpinOnArrival(false);
  }

  if (opening.state === "open" && guiding === null) {
    setGuiding(
      opening.household.mealBank.length === 0 &&
        !firstRunSkipped(opening.household.slug),
    );
  }

  if (opening.state === "looking") {
    return (
      <AppShell>
        <p className="text-stone-400">Opening…</p>
      </AppShell>
    );
  }

  if (opening.state === "missing" || opening.state === "failed") {
    return (
      <AppShell>
        <p role="alert" className="max-w-md text-center text-rose-300">
          {opening.state === "missing" ? notFound.message : opening.message}
        </p>
        <a href="/" className="text-stone-400 underline underline-offset-4">
          Back to the start
        </a>
      </AppShell>
    );
  }

  const { household, show } = opening;

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
            households={households}
            household={household}
            onChange={show}
            onDone={() => onGo(`/${household.slug}`)}
          />
        ) : view === "meal-bank" ? (
          <MealBank
            households={households}
            slug={household.slug}
            meals={household.mealBank}
            onChange={(mealBank) => show({ ...household, mealBank })}
            onBack={() => onGo(`/${household.slug}`)}
          />
        ) : guiding ? (
          <FirstRun
            households={households}
            slug={household.slug}
            meals={household.mealBank}
            onChange={(mealBank) => show({ ...household, mealBank })}
            onSpin={() => {
              setSpinOnArrival(true);
              setGuiding(false);
            }}
            onSkip={() => {
              skipFirstRun(household.slug);
              setGuiding(false);
            }}
          />
        ) : (
          <>
            <TheWeek
              cookingDays={household.cookingDays}
              mealBank={household.mealBank}
              spinOnArrival={spinOnArrival}
            />

            <div className="flex flex-wrap items-start justify-center gap-2">
              <ShareButton
                label="Share the Household"
                shareable={{
                  title: household.name ?? household.slug,
                  url: householdLink(household.slug),
                }}
              />

              <button
                type="button"
                onClick={() => onGo(`/${household.slug}/meal-bank`)}
                aria-label={`Meal Bank, ${mealsHeld(household.mealBank.length)}`}
                className={`${quietButtonStyle} gap-2`}
              >
                Meal Bank
                <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-300">
                  {household.mealBank.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onGo(`/${household.slug}/settings`)}
                className={quietButtonStyle}
              >
                Settings
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};
