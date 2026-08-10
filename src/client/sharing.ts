import type { Meal } from "../shared/meal";
import type { Recipe } from "../shared/recipe";
import type { Slug } from "../shared/slug";
import type { Week } from "../shared/week";
import { dayLabels } from "./days";

export type Shareable = {
  title: string;
  text?: string;
  url?: string;
};

export type Sharing = "shared" | "copied" | "cancelled" | "failed";

const anEmptyDay = "-";

export const weekAsText = (week: Week) =>
  week
    .map(({ day, meal }) => `${dayLabels[day]}: ${meal?.name ?? anEmptyDay}`)
    .join("\n");

export const recipeAsShareable = (
  name: Meal["name"],
  recipe: Recipe,
): Shareable => ({
  title: name,
  text: [name, recipe.ingredients, recipe.method].filter(Boolean).join("\n\n"),
  url: recipe.source ?? undefined,
});

export const householdLink = (slug: Slug) =>
  new URL(`/${slug}`, location.href).href;

const asOneText = ({ text, url }: Shareable) =>
  [text, url].filter(Boolean).join("\n");

const dismissed = (thrown: unknown) =>
  thrown instanceof Object && "name" in thrown && thrown.name === "AbortError";

export const shareOrCopy = async (shareable: Shareable): Promise<Sharing> => {
  if (navigator.share) {
    try {
      await navigator.share(shareable);
      return "shared";
    } catch (thrown) {
      if (dismissed(thrown)) return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(asOneText(shareable));
    return "copied";
  } catch {
    return "failed";
  }
};
