import { afterEach, describe, expect, it, vi } from "vitest";
import { duplicateMeal, failure, notFound } from "../shared/api";
import { Refusal, messageFor } from "./households";
import { householdsOverHttp } from "./households-over-http";
import {
  aHousehold,
  aMeal,
  aMealWithARecipe,
  aSlug,
  aSource,
  answerWith,
} from "./test-fixtures";

const answeringRaw = (raw: string) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(raw));

const sent = () => {
  const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
  const body = options?.body;
  return {
    url,
    method: options?.method,
    body: typeof body === "string" ? (JSON.parse(body) as unknown) : undefined,
  };
};

const aDraft = { name: "Butter chicken", description: "With coconut milk" };

const aRecipeDraft = {
  source: aSource,
  ingredients: "1 onion\n2 tbsp butter",
  method: "Fry the paste.\n\nSimmer it.",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Households over HTTP", () => {
  it("creates a Household by posting to the collection", async () => {
    answerWith(aHousehold, 201);

    await expect(householdsOverHttp.create()).resolves.toEqual(aHousehold);
    expect(sent().url).toBe("/api/households");
    expect(sent().method).toBe("POST");
  });

  it("opens a Household by its Slug", async () => {
    answerWith(aHousehold);

    await expect(householdsOverHttp.open(aSlug)).resolves.toEqual(aHousehold);
    expect(sent().url).toBe(`/api/households/${aSlug}`);
    expect(sent().method).toBe("GET");
  });

  it("resolves to nothing for a Household that does not exist", async () => {
    answerWith(notFound, 404);

    await expect(householdsOverHttp.open(aSlug)).resolves.toBeNull();
  });

  it("drops a lookup the caller has abandoned", async () => {
    answerWith(aHousehold);
    const abandoned = new AbortController();

    await householdsOverHttp.open(aSlug, abandoned.signal);

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    expect(options?.signal).toBe(abandoned.signal);
  });

  it("updates a Household with only what changed", async () => {
    answerWith({ ...aHousehold, name: "The Khans" });

    await expect(
      householdsOverHttp.update(aSlug, { name: "The Khans" }),
    ).resolves.toEqual({ ...aHousehold, name: "The Khans" });
    expect(sent().url).toBe(`/api/households/${aSlug}`);
    expect(sent().method).toBe("PATCH");
    expect(sent().body).toEqual({ name: "The Khans" });
  });

  it("adds a Meal to the Meal Bank", async () => {
    answerWith(aMeal, 201);

    await expect(householdsOverHttp.addMeal(aSlug, aDraft)).resolves.toEqual(
      aMeal,
    );
    expect(sent().url).toBe(`/api/households/${aSlug}/meals`);
    expect(sent().method).toBe("POST");
    expect(sent().body).toEqual(aDraft);
  });

  it("edits a Meal in place", async () => {
    answerWith(aMeal);

    await expect(
      householdsOverHttp.editMeal(aSlug, aMeal.id, aDraft),
    ).resolves.toEqual(aMeal);
    expect(sent().url).toBe(`/api/households/${aSlug}/meals/${aMeal.id}`);
    expect(sent().method).toBe("PATCH");
    expect(sent().body).toEqual(aDraft);
  });

  it("sets a Meal's Recipe on its own sub-resource", async () => {
    answerWith(aMealWithARecipe);

    await expect(
      householdsOverHttp.setRecipe(aSlug, aMealWithARecipe.id, aRecipeDraft),
    ).resolves.toEqual(aMealWithARecipe);
    expect(sent().url).toBe(
      `/api/households/${aSlug}/meals/${aMealWithARecipe.id}/recipe`,
    );
    expect(sent().method).toBe("PUT");
  });

  it("sends nothing but the Recipe, so a save cannot rename the Meal", async () => {
    answerWith(aMealWithARecipe);

    await householdsOverHttp.setRecipe(
      aSlug,
      aMealWithARecipe.id,
      aRecipeDraft,
    );

    expect(sent().body).toEqual(aRecipeDraft);
  });

  it("removes a Meal from the Meal Bank", async () => {
    answerWith(undefined, 204);

    await expect(
      householdsOverHttp.removeMeal(aSlug, aMeal.id),
    ).resolves.toBeUndefined();
    expect(sent().url).toBe(`/api/households/${aSlug}/meals/${aMeal.id}`);
    expect(sent().method).toBe("DELETE");
  });

  it("surfaces the Worker's own words when a change is refused", async () => {
    answerWith(duplicateMeal, 409);

    const refused = await householdsOverHttp
      .addMeal(aSlug, aDraft)
      .catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(Refusal);
    expect(messageFor(refused)).toBe(duplicateMeal.message);
  });

  it("fails plainly when the Worker says nothing a cook can read", async () => {
    answerWith(undefined, 500);

    const failed = await householdsOverHttp
      .addMeal(aSlug, aDraft)
      .catch((error: unknown) => error);

    expect(failed).toBeInstanceOf(Error);
    expect(failed).not.toBeInstanceOf(Refusal);
    expect(messageFor(failed)).toBe(failure.message);
  });

  it("fails when a refused Meal removal says nothing a cook can read", async () => {
    answerWith(undefined, 500);

    await expect(
      householdsOverHttp.removeMeal(aSlug, aMeal.id),
    ).rejects.toThrow();
  });

  it("fails on an answer it cannot read", async () => {
    answeringRaw("not json at all");

    const failed = await householdsOverHttp
      .open(aSlug)
      .catch((error: unknown) => error);

    expect(failed).toBeInstanceOf(Error);
    expect(messageFor(failed)).toBe(failure.message);
  });

  it("fails on an answer shaped like nothing it knows", async () => {
    answerWith({ slug: "not-a-household" });

    await expect(householdsOverHttp.open(aSlug)).rejects.toThrow();
  });

  it("fails when the Worker cannot be reached at all", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const failed = await householdsOverHttp
      .create()
      .catch((error: unknown) => error);

    expect(messageFor(failed)).toBe(failure.message);
  });
});
