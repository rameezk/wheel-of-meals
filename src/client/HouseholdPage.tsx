import { useState } from "react";
import { notFound } from "../shared/api";
import type { Slug } from "../shared/slug";
import { AppShell } from "./AppShell";
import { FirstRun } from "./FirstRun";
import { firstRunSkipped, skipFirstRun } from "./guiding";
import type { Households } from "./households";
import { HouseholdSettings } from "./HouseholdSettings";
import { MealBank } from "./MealBank";
import { whatTheBankHolds } from "./meals";
import { useOpenHousehold } from "./open-household";
import type { View } from "./route";
import { ShareButton } from "./Share";
import { householdLink } from "./sharing";
import { quietButtonStyle, rowStyle, settledRowStyle } from "./styles";
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
    if (opening.state === "open") opening.dismiss();
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

  const { household } = opening;

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
            openHousehold={opening}
            onDone={() => onGo(`/${household.slug}`)}
          />
        ) : view === "meal-bank" ? (
          <MealBank
            openHousehold={opening}
            onBack={() => onGo(`/${household.slug}`)}
          />
        ) : guiding ? (
          <FirstRun
            openHousehold={opening}
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
            <TheWeek openHousehold={opening} spinOnArrival={spinOnArrival} />

            <div className="flex w-full flex-col gap-3 border-t border-stone-900 pt-6">
              <button
                type="button"
                onClick={() => onGo(`/${household.slug}/meal-bank`)}
                className={`${rowStyle} ${settledRowStyle} flex w-full items-center justify-between gap-3 text-left hover:border-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400`}
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium break-words text-stone-100">
                    Open the Meal Bank
                  </span>
                  <span className="text-sm break-words text-stone-400">
                    {whatTheBankHolds(household.mealBank.length)}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-stone-500">
                  ›
                </span>
              </button>

              <div className="flex items-start justify-center gap-2">
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
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};
