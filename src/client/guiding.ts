import { z } from "zod";
import { slugSchema, type Slug } from "../shared/slug";

const key = "wheel-of-meals.first-run-skipped";

const skippedSchema = z.array(slugSchema).catch([]);

const read = (): Slug[] => {
  try {
    return skippedSchema.parse(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return [];
  }
};

export const firstRunSkipped = (slug: Slug) => read().includes(slug);

export const skipFirstRun = (slug: Slug) => {
  const already = read();
  if (already.includes(slug)) return;

  try {
    localStorage.setItem(key, JSON.stringify([...already, slug]));
  } catch {
    return;
  }
};
