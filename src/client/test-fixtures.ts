import { vi } from "vitest";
import type { Household } from "../shared/household";

export const aSlug = "banana-apple-delicious-sauce";

export const aHousehold: Household = {
  slug: aSlug,
  name: null,
  cookingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  mealBank: [],
  createdAt: "2026-08-04T12:00:00.000Z",
};

export const answerWith = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
