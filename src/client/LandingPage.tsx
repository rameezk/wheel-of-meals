import { useState, type FormEvent } from "react";
import type { Household } from "../shared/household";
import { readSlug, type Slug } from "../shared/slug";
import { AppShell } from "./AppShell";
import { messageFor, type Households } from "./households";
import { remembered } from "./remembered";
import { alertStyle, fieldStyle, loudButtonStyle } from "./styles";

const notFourWords = "That is not four words. Type all four.";

const noSuchHousehold =
  "Those four words were not found. Check the spelling and try again.";

const bigButtonStyle =
  "w-full rounded-full px-8 py-3.5 text-lg font-medium break-words transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60";

const primaryStyle = `${bigButtonStyle} bg-emerald-500 text-stone-950 hover:bg-emerald-400`;

const secondaryStyle = `${bigButtonStyle} border border-stone-700 text-stone-100 hover:border-stone-500`;

const smallButtonStyle =
  "flex min-h-11 items-center justify-center self-start rounded-full border border-emerald-500/50 px-6 text-sm font-medium text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60";

type Creation =
  | { state: "idle" }
  | { state: "creating" }
  | { state: "created"; household: Household }
  | { state: "failed"; problem: string };

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
          className={`${loudButtonStyle} flex-1 px-6 py-3 text-center font-medium`}
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

type SlugEntryProps = {
  households: Households;
  onGo: (path: string) => void;
};

const SlugEntry = ({ households, onGo }: SlugEntryProps) => {
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const open = async (event: FormEvent) => {
    event.preventDefault();

    const slug = readSlug(typed);
    if (slug === null) {
      setProblem(notFourWords);
      return;
    }

    setOpening(true);
    setProblem(null);
    try {
      if ((await households.open(slug)) === null) setProblem(noSuchHousehold);
      else onGo(`/${slug}`);
    } catch (error) {
      setProblem(messageFor(error));
    } finally {
      setOpening(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void open(event)}
      className="flex w-full flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5 text-sm text-stone-400">
        Your four words
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="banana apple delicious sauce"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={fieldStyle}
        />
      </label>

      {problem && (
        <p role="alert" className={alertStyle}>
          {problem}
        </p>
      )}

      <button type="submit" disabled={opening} className={smallButtonStyle}>
        {opening ? "Opening…" : "Open"}
      </button>
    </form>
  );
};

type LandingPageProps = {
  households: Households;
  onGo: (path: string) => void;
};

export const LandingPage = ({ households, onGo }: LandingPageProps) => {
  const [creation, setCreation] = useState<Creation>({ state: "idle" });
  const [lastOpened] = useState(remembered);

  const create = async () => {
    setCreation({ state: "creating" });
    try {
      setCreation({ state: "created", household: await households.create() });
    } catch (error) {
      setCreation({
        state: "failed",
        problem: messageFor(error),
      });
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
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        {lastOpened && (
          <button
            type="button"
            onClick={() => onGo(`/${lastOpened.slug}`)}
            className={primaryStyle}
          >
            Open {lastOpened.name ?? lastOpened.slug}
          </button>
        )}

        <button
          type="button"
          onClick={() => void create()}
          disabled={creation.state === "creating"}
          className={lastOpened ? secondaryStyle : primaryStyle}
        >
          {creation.state === "creating" ? "Creating…" : "Create a Household"}
        </button>

        {creation.state === "failed" && (
          <p role="alert" className="text-rose-300">
            {creation.problem}
          </p>
        )}

        <div className="flex w-full items-center gap-3 text-sm text-stone-600">
          <span className="h-px flex-1 bg-stone-800" />
          or
          <span className="h-px flex-1 bg-stone-800" />
        </div>

        <SlugEntry households={households} onGo={onGo} />
      </div>
    </AppShell>
  );
};
