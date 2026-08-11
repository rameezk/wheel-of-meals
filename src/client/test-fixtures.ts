import { vi } from "vitest";
import type { Household } from "../shared/household";
import type { Meal } from "../shared/meal";
import type { Recipe } from "../shared/recipe";
import type { OpenHousehold } from "./open-household";

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
  recipe: null,
};

export const aSource = "https://recipes.example.com/butter-chicken";

export const aRecipe = (parts: Partial<Recipe>): Recipe => ({
  source: null,
  ingredients: null,
  method: null,
  ...parts,
});

export const aMealWithARecipe: Meal = {
  id: "meal-9",
  name: "Lamb curry",
  description: null,
  recipe: aRecipe({ source: aSource }),
};

export const anOpenHousehold = (
  household: Partial<Household>,
  parts: Partial<OpenHousehold> = {},
): OpenHousehold => ({
  state: "open",
  household: { ...aHousehold, ...household },
  working: false,
  problem: null,
  dismiss: () => {},
  show: () => {},
  update: () => Promise.resolve(null),
  addMeal: () => Promise.resolve(null),
  saveMeal: () => Promise.resolve(null),
  removeMeal: () => Promise.resolve(null),
  ...parts,
});

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
