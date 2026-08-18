import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Meal } from "../shared/meal";
import type { WholeMeal } from "./households";
import { TheMeal } from "./Meal";
import { ReadMeal } from "./ReadMeal";
import { useMealWriting } from "./meal-writing";
import { useScrollLock } from "./scroll-lock";

type MealSheetProps = {
  meal: Meal;
  working: boolean;
  problem: string | null;
  onSave: (draft: WholeMeal) => Promise<Meal | null>;
  onClose: () => void;
};

type Mode = "reading" | "editing";

const canBeFocused =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const MealSheet = ({
  meal,
  working,
  problem,
  onSave,
  onClose,
}: MealSheetProps) => {
  const toReading = useRef(() => {});
  const writing = useMealWriting(meal, () => toReading.current());
  const [mode, setMode] = useState<Mode>(
    writing.restored ? "editing" : "reading",
  );
  const headingId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cameFrom = useRef(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const latest = useRef(writing);
  const modeRef = useRef(mode);
  const closeRef = useRef(onClose);

  useScrollLock();

  useEffect(() => {
    latest.current = writing;
    modeRef.current = mode;
    closeRef.current = onClose;
    toReading.current = () => setMode("reading");
  });

  useEffect(() => {
    const returnTo = cameFrom.current;
    return () => returnTo?.focus();
  }, []);

  useEffect(() => {
    window.history.pushState({ meal: meal.id }, "");
    let wentBack = false;

    const back = () => {
      if (modeRef.current === "editing") {
        window.history.pushState({ meal: meal.id }, "");
        latest.current.askToLeave();
        return;
      }

      wentBack = true;
      closeRef.current();
    };

    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      if (!wentBack) window.history.back();
    };
  }, [meal.id]);

  const save = async (draft: WholeMeal) => {
    if (await onSave(draft)) setMode("reading");
  };

  const keptWithin = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (mode === "editing") writing.askToLeave();
      else onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const within = [
      ...(panel.current?.querySelectorAll<HTMLElement>(canBeFocused) ?? []),
    ];
    const first = within[0];
    const last = within.at(-1);
    if (!first || !last || first === last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-stone-950/95 p-4 backdrop-blur-sm">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={keptWithin}
        className="mx-auto flex max-h-full w-full max-w-md flex-1 flex-col overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 p-5"
      >
        {mode === "editing" ? (
          <TheMeal
            meal={meal}
            headingId={headingId}
            working={working}
            problem={problem}
            writing={writing}
            onSave={(draft) => void save(draft)}
          />
        ) : (
          <ReadMeal
            meal={meal}
            headingId={headingId}
            onEdit={() => setMode("editing")}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};
