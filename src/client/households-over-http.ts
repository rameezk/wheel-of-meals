import { z } from "zod";
import { householdSchema } from "../shared/household";
import { mealSchema } from "../shared/meal";
import { Refusal, type Households } from "./households";

const collection = "/api/households";

const refusalSchema = z.object({ error: z.string(), message: z.string() });

const readJson = (response: Response) =>
  response.json().catch(() => null) as Promise<unknown>;

const refuse = async (response: Response): Promise<never> => {
  const refusal = refusalSchema.safeParse(await readJson(response));
  if (refusal.success) throw new Refusal(refusal.data.message);
  throw new Error(`The Worker answered ${response.status}`);
};

const read = async <Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
): Promise<z.output<Schema>> => {
  if (!response.ok) return refuse(response);

  const body = schema.safeParse(await readJson(response));
  if (!body.success) throw new Error("The Worker's answer could not be read");
  return body.data;
};

const sending = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const householdsOverHttp: Households = {
  create: async () =>
    read(await fetch(collection, { method: "POST" }), householdSchema),

  open: async (slug, signal) => {
    const response = await fetch(`${collection}/${slug}`, {
      method: "GET",
      signal,
    });
    if (response.status === 404) return null;
    return read(response, householdSchema);
  },

  update: async (slug, changes) =>
    read(
      await fetch(`${collection}/${slug}`, sending("PATCH", changes)),
      householdSchema,
    ),

  addMeal: async (slug, draft) =>
    read(
      await fetch(`${collection}/${slug}/meals`, sending("POST", draft)),
      mealSchema,
    ),

  saveMeal: async (slug, id, draft) =>
    read(
      await fetch(`${collection}/${slug}/meals/${id}`, sending("PATCH", draft)),
      mealSchema,
    ),

  removeMeal: async (slug, id) => {
    const response = await fetch(`${collection}/${slug}/meals/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) return refuse(response);
  },
};
