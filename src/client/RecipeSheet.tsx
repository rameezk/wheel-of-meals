import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import type { Meal } from "../shared/meal";
import type { RecipeDraft } from "./households";
import { TheRecipe } from "./Recipe";

type RecipeSheetProps = {
  meal: Meal;
  working: boolean;
  problem: string | null;
  onSave: (draft: RecipeDraft) => void;
  onClose: () => void;
};

const canBeFocused =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const RecipeSheet = ({
  meal,
  working,
  problem,
  onSave,
  onClose,
}: RecipeSheetProps) => {
  const headingId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cameFrom = useRef(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const closing = useRef(onClose);

  useEffect(() => {
    closing.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const returnTo = cameFrom.current;
    return () => returnTo?.focus();
  }, []);

  useEffect(() => {
    window.history.pushState({ recipe: meal.id }, "");
    let wentBack = false;

    const back = () => {
      wentBack = true;
      closing.current();
    };

    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      if (!wentBack) window.history.back();
    };
  }, [meal.id]);

  const keptWithin = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
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
        <TheRecipe
          meal={meal}
          headingId={headingId}
          working={working}
          problem={problem}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};
