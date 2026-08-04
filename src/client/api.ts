import { householdSchema, type Household } from "../shared/household";
import type { Slug } from "../shared/slug";

export const createHousehold = async (): Promise<Household> => {
  const response = await fetch("/api/households", { method: "POST" });
  if (!response.ok) throw new Error(`Creation failed with ${response.status}`);
  return householdSchema.parse(await response.json());
};

export const fetchHousehold = async (
  slug: Slug,
  signal?: AbortSignal,
): Promise<Household | null> => {
  const response = await fetch(`/api/households/${slug}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Lookup failed with ${response.status}`);
  return householdSchema.parse(await response.json());
};
