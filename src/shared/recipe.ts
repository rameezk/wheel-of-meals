import { z } from "zod";

export const sourceMaxLength = 1000;

export const ingredientsMaxLength = 1000;

export const methodMaxLength = 2000;

export const sourceTooLong = `A Source cannot be longer than ${sourceMaxLength} characters.`;

export const sourceIsNotAWebLink =
  "A Source has to be an http:// or https:// link.";

export const sourceIsUnreadable = "That Source cannot be read as a link.";

export const ingredientsTooLong = `Ingredients cannot be longer than ${ingredientsMaxLength} characters.`;

export const methodTooLong = `A Method cannot be longer than ${methodMaxLength} characters.`;

const partsSchema = z.object({
  source: z.string().nullable(),
  ingredients: z.string().nullable(),
  method: z.string().nullable(),
});

type Parts = z.infer<typeof partsSchema>;

const holdsAPart = (parts: Parts) =>
  parts.source !== null || parts.ingredients !== null || parts.method !== null;

export const recipeSchema = partsSchema.refine(holdsAPart);

export type Recipe = z.infer<typeof recipeSchema>;

export const recipeOf = (parts: Parts): Recipe | null =>
  holdsAPart(parts) ? parts : null;

export type TypedRecipe = {
  source: string;
  ingredients: string;
  method: string;
};

type PartRead = { kept: string | null } | { refusal: string };

type RecipeRead = { recipe: Recipe | null } | { refusal: string };

const asUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const webSchemes = new Set(["http:", "https:"]);

const declaresAScheme = /^[a-z][a-z0-9+-]*:/i;

const readSource = (typed: string): PartRead => {
  const value = typed.trim();
  if (value.length === 0) return { kept: null };
  if (value.length > sourceMaxLength) return { refusal: sourceTooLong };

  if (declaresAScheme.test(value)) {
    const declared = asUrl(value);
    if (!declared) return { refusal: sourceIsUnreadable };

    return webSchemes.has(declared.protocol)
      ? { kept: value }
      : { refusal: sourceIsNotAWebLink };
  }

  const prefixed = `https://${value}`;
  if (!asUrl(prefixed)) return { refusal: sourceIsUnreadable };

  return prefixed.length > sourceMaxLength
    ? { refusal: sourceTooLong }
    : { kept: prefixed };
};

const readFreeText =
  (cap: number, tooLong: string) =>
  (typed: string): PartRead => {
    const value = typed.trim();
    if (value.length === 0) return { kept: null };
    return value.length > cap ? { refusal: tooLong } : { kept: value };
  };

const readIngredients = readFreeText(ingredientsMaxLength, ingredientsTooLong);

const readMethod = readFreeText(methodMaxLength, methodTooLong);

export const readRecipe = (typed: TypedRecipe): RecipeRead => {
  const source = readSource(typed.source);
  if ("refusal" in source) return source;

  const ingredients = readIngredients(typed.ingredients);
  if ("refusal" in ingredients) return ingredients;

  const method = readMethod(typed.method);
  if ("refusal" in method) return method;

  return {
    recipe: recipeOf({
      source: source.kept,
      ingredients: ingredients.kept,
      method: method.kept,
    }),
  };
};

export const setRecipeSchema = z
  .object({
    source: z.string().nullish(),
    ingredients: z.string().nullish(),
    method: z.string().nullish(),
  })
  .transform((typed, ctx) => {
    const read = readRecipe({
      source: typed.source ?? "",
      ingredients: typed.ingredients ?? "",
      method: typed.method ?? "",
    });

    if ("refusal" in read) {
      ctx.addIssue({ code: "custom", message: read.refusal });
      return z.NEVER;
    }

    return read.recipe;
  });

export type SetRecipe = z.infer<typeof setRecipeSchema>;
