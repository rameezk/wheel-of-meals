import { z } from "zod";
import type { RecipeDraft } from "./households";

const key = "wheel-of-meals.recipe-drafts";

const heldSchema = z
  .record(
    z.string(),
    z.object({
      source: z.string(),
      ingredients: z.string(),
      method: z.string(),
    }),
  )
  .catch({});

type Held = z.infer<typeof heldSchema>;

const read = (): Held => {
  try {
    return heldSchema.parse(JSON.parse(localStorage.getItem(key) ?? "{}"));
  } catch {
    return {};
  }
};

const write = (held: Held) => {
  try {
    localStorage.setItem(key, JSON.stringify(held));
  } catch {
    return;
  }
};

export const heldDraft = (id: string): RecipeDraft | null => read()[id] ?? null;

export const holdDraft = (id: string, draft: RecipeDraft) =>
  write({ ...read(), [id]: draft });

export const forgetDraft = (id: string) => {
  const held = read();
  if (!(id in held)) return;

  delete held[id];
  write(held);
};
