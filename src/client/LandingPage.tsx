import { useState } from "react";
import { failure } from "../shared/api";
import type { Household } from "../shared/household";
import type { Slug } from "../shared/slug";
import { createHousehold } from "./api";
import { AppShell } from "./AppShell";

type Creation =
  | { state: "idle" }
  | { state: "creating" }
  | { state: "created"; household: Household }
  | { state: "failed" };

type Copying = "untouched" | "copied" | "refused";

const SlugReveal = ({ slug }: { slug: Slug }) => {
  const [copying, setCopying] = useState<Copying>("untouched");
  const link = `${window.location.origin}/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopying("copied");
    } catch {
      setCopying("refused");
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      <p className="text-stone-400">Your Household lives here:</p>

      <p className="w-full rounded-2xl border border-stone-800 bg-stone-900 px-5 py-4 text-center">
        <span className="block text-sm break-all text-stone-500">
          {window.location.host}/
        </span>
        <span className="block text-xl font-semibold break-words text-emerald-300">
          {slug}
        </span>
      </p>

      <div
        role="alert"
        className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-center text-amber-200"
      >
        Save this link now. It is the only way in, and it cannot be recovered.
        Lose it and the Household is gone.
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void copy()}
          className="flex-1 rounded-full border border-stone-700 px-6 py-3 font-medium text-stone-100 transition hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {copying === "copied" ? "Copied" : "Copy the link"}
        </button>
        <a
          href={`/${slug}`}
          className="flex-1 rounded-full bg-emerald-500 px-6 py-3 text-center font-medium text-stone-950 transition hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Open my Household
        </a>
      </div>

      {copying === "refused" && (
        <p className="text-center text-rose-300">
          Copying is blocked in this browser. Select the link above and copy it
          by hand.
        </p>
      )}
    </div>
  );
};

export const LandingPage = () => {
  const [creation, setCreation] = useState<Creation>({ state: "idle" });

  const create = async () => {
    setCreation({ state: "creating" });
    try {
      setCreation({ state: "created", household: await createHousehold() });
    } catch {
      setCreation({ state: "failed" });
    }
  };

  if (creation.state === "created") {
    return (
      <AppShell>
        <SlugReveal slug={creation.household.slug} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={() => void create()}
          disabled={creation.state === "creating"}
          className="rounded-full bg-emerald-500 px-8 py-3.5 text-lg font-medium text-stone-950 transition hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60"
        >
          {creation.state === "creating" ? "Creating…" : "Create a Household"}
        </button>

        {creation.state === "failed" && (
          <p role="alert" className="text-rose-300">
            {failure.message}
          </p>
        )}
      </div>
    </AppShell>
  );
};
