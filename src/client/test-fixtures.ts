import { vi } from "vitest";
import type { Household } from "../shared/household";
import type { Meal } from "../shared/meal";

export const aSlug = "banana-apple-delicious-sauce";

export const aHousehold: Household = {
  slug: aSlug,
  name: null,
  cookingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  mealBank: [],
  createdAt: "2026-08-04T12:00:00.000Z",
};

export const aMeal: Meal = {
  id: "meal-1",
  name: "Butter chicken",
  description: "The one with the coconut milk",
};

export const aStockedHousehold: Household = {
  ...aHousehold,
  mealBank: [aMeal],
};

const fitWith = (name: string, value: unknown) =>
  Object.defineProperty(navigator, name, { value, configurable: true });

export const withAShareSheet = () => {
  const share = vi.fn<(shareable: ShareData) => Promise<void>>();
  share.mockResolvedValue(undefined);
  fitWith("share", share);
  return share;
};

export const withAClipboard = () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();
  writeText.mockResolvedValue(undefined);
  fitWith("clipboard", { writeText });
  return writeText;
};

export const withNoSharing = () => {
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
};

const answer = (body: unknown, status: number) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const answerWith = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(body, status));

export const answerInTurn = (
  ...answers: { body?: unknown; status?: number }[]
) => {
  const spy = vi.spyOn(globalThis, "fetch");
  for (const { body, status } of answers)
    spy.mockResolvedValueOnce(answer(body, status ?? 200));
  return spy;
};
