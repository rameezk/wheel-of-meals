import type { Recipe } from "../shared/recipe";
import { MethodIcon, SourceIcon } from "./Icons";

export const hasASourceRecipe = "has a Recipe to follow";
export const hasAMethodRecipe = "has a Recipe of its own";

export const RecipeMarker = ({ recipe }: { recipe: Recipe }) => (
  <span className="shrink-0 self-center text-sm text-emerald-300">
    {recipe.source ? <SourceIcon /> : <MethodIcon />}
    <span className="sr-only">
      , {recipe.source ? hasASourceRecipe : hasAMethodRecipe}
    </span>
  </span>
);
