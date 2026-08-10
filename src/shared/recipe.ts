import { z } from "zod";

export const sourceMaxLength = 1000;

export const sourceTooLong = `A Source cannot be longer than ${sourceMaxLength} characters.`;

export const sourceIsNotAWebLink =
  "A Source has to be an http:// or https:// link.";

export const sourceIsUnreadable = "That Source cannot be read as a link.";

export const recipeSchema = z.object({ source: z.string() });

export type Recipe = z.infer<typeof recipeSchema>;

export const recipeOf = (source: string | null): Recipe | null =>
  source === null ? null : { source };

export type SourceRead = { source: string | null } | { refusal: string };

const asUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const webSchemes = new Set(["http:", "https:"]);

const declaresAScheme = /^[a-z][a-z0-9+-]*:/i;

export const readSource = (typed: string): SourceRead => {
  const value = typed.trim();
  if (value.length === 0) return { source: null };
  if (value.length > sourceMaxLength) return { refusal: sourceTooLong };

  if (declaresAScheme.test(value)) {
    const declared = asUrl(value);
    if (!declared) return { refusal: sourceIsUnreadable };

    return webSchemes.has(declared.protocol)
      ? { source: value }
      : { refusal: sourceIsNotAWebLink };
  }

  const prefixed = `https://${value}`;
  if (!asUrl(prefixed)) return { refusal: sourceIsUnreadable };

  return prefixed.length > sourceMaxLength
    ? { refusal: sourceTooLong }
    : { source: prefixed };
};

const sourceSchema = z.string().transform((typed, ctx) => {
  const read = readSource(typed);
  if ("refusal" in read) {
    ctx.addIssue({ code: "custom", message: read.refusal });
    return z.NEVER;
  }

  return read.source;
});

export const setRecipeSchema = z
  .object({ source: sourceSchema.nullish() })
  .transform(({ source }) => ({ source: source ?? null }));

export type SetRecipe = z.infer<typeof setRecipeSchema>;
