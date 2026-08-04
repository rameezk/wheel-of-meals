import { useEffect, useState } from "react";
import { healthSchema } from "../shared/health";

type ApiState = "checking" | "awake" | "unreachable";

const checkApi = async (
  signal: AbortSignal,
): Promise<Exclude<ApiState, "checking">> => {
  try {
    const response = await fetch("/api/health", { signal });
    if (!response.ok) return "unreachable";
    const health = healthSchema.safeParse(await response.json());
    return health.success ? "awake" : "unreachable";
  } catch {
    return "unreachable";
  }
};

const presentation: Record<ApiState, { label: string; dotClass: string }> = {
  checking: { label: "Checking the API…", dotClass: "bg-stone-500" },
  awake: { label: "API is awake", dotClass: "bg-emerald-400" },
  unreachable: { label: "API is unreachable", dotClass: "bg-rose-400" },
};

export const App = () => {
  const [api, setApi] = useState<ApiState>("checking");
  const { label, dotClass } = presentation[api];

  useEffect(() => {
    const controller = new AbortController();
    void checkApi(controller.signal).then((state) => {
      if (!controller.signal.aborted) setApi(state);
    });
    return () => controller.abort();
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-stone-950 px-6 text-stone-100">
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

      <p
        aria-live="polite"
        className="flex items-center gap-2.5 rounded-full border border-stone-800 bg-stone-900/60 py-2 pr-4 pl-3 text-sm text-stone-300"
      >
        <span aria-hidden className={`size-2 rounded-full ${dotClass}`} />
        {label}
      </p>
    </main>
  );
};
