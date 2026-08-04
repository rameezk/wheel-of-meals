import type { ReactNode } from "react";

export const AppShell = ({ children }: { children: ReactNode }) => (
  <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-stone-950 px-6 py-12 text-stone-100">
    <div className="flex flex-col items-center gap-3 text-center">
      <span aria-hidden className="text-6xl">
        🍽️
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Wheel of Meals
      </h1>
      <p className="max-w-sm text-balance text-stone-400">
        Randomise your meals for the week.
      </p>
    </div>

    {children}
  </main>
);
