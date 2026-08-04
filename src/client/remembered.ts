import { z } from "zod";
import { slugSchema, type Slug } from "../shared/slug";

const key = "wheel-of-meals.household";

const rememberedSchema = z.object({
  slug: slugSchema,
  name: z.string().nullable(),
});

export type RememberedHousehold = z.infer<typeof rememberedSchema>;

const read = (): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
};

export const remembered = (): RememberedHousehold | null => {
  const household = rememberedSchema.safeParse(read());
  return household.success ? household.data : null;
};

export const remember = ({ slug, name }: RememberedHousehold) => {
  try {
    localStorage.setItem(key, JSON.stringify({ slug, name }));
  } catch {
    return;
  }
};

export const forget = (slug: Slug) => {
  if (remembered()?.slug !== slug) return;
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
};
