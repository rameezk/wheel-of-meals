import { useSyncExternalStore } from "react";

export const wheelSpinMillis = 2200;
export const flipStaggerMillis = 90;

const lessMotion = "(prefers-reduced-motion: reduce)";

const asked = () =>
  typeof window.matchMedia === "function"
    ? window.matchMedia(lessMotion)
    : null;

const watch = (onChange: () => void) => {
  const media = asked();
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
};

export const useLessMotion = () =>
  useSyncExternalStore(
    watch,
    () => asked()?.matches ?? false,
    () => true,
  );
