import { SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { foodWords } from "../shared/slug";

const origin = "https://example.com";

const createHousehold = async () => {
  const response = await SELF.fetch(`${origin}/api/households`, {
    method: "POST",
  });
  return { response, body: await response.json<Record<string, unknown>>() };
};

const getHousehold = (slug: string) =>
  SELF.fetch(`${origin}/api/households/${slug}`);

const randomReturning = (...values: number[]) => {
  let next = 0;
  vi.spyOn(Math, "random").mockImplementation(
    () => values[Math.min(next++, values.length - 1)] ?? 0,
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("creating a Household", () => {
  it("answers with a four-word Slug", async () => {
    const { response, body } = await createHousehold();

    expect(response.status).toBe(201);
    expect(body.slug).toMatch(/^[a-z]+(-[a-z]+){3}$/);
    for (const word of String(body.slug).split("-")) {
      expect(foodWords).toContain(word);
    }
  });

  it("starts on Sunday through Thursday, unnamed, with an empty Meal Bank", async () => {
    const { body } = await createHousehold();

    expect(body.cookingDays).toEqual([
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
    ]);
    expect(body.name).toBeNull();
    expect(body.mealBank).toEqual([]);
    expect(Date.parse(String(body.createdAt))).not.toBeNaN();
  });

  it("gives each Household its own Slug", async () => {
    const first = await createHousehold();
    const second = await createHousehold();

    expect(first.body.slug).not.toBe(second.body.slug);
  });

  it("draws another Slug when the first one is taken", async () => {
    randomReturning(0, 0, 0, 0);
    const taken = await createHousehold();

    randomReturning(0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5);
    const retried = await createHousehold();

    expect(retried.response.status).toBe(201);
    expect(retried.body.slug).not.toBe(taken.body.slug);
    expect((await getHousehold(String(taken.body.slug))).status).toBe(200);
  });

  it("refuses rather than reusing a Slug when every draw is taken", async () => {
    randomReturning(0);
    await createHousehold();

    randomReturning(0);
    const { response, body } = await createHousehold();

    expect(response.status).toBe(500);
    expect(body.slug).toBeUndefined();
  });
});

describe("retrieving a Household", () => {
  it("returns the Household its Slug opens", async () => {
    const { body: created } = await createHousehold();

    const response = await getHousehold(String(created.slug));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(created);
  });

  it("answers an unknown Slug with a 404 that admits nothing", async () => {
    const response = await getHousehold("banana-apple-delicious-sauce");

    expect(response.status).toBe(404);
    const body = await response.json<{ error: string; message: string }>();
    expect(body.error).toBe("not_found");
    expect(body.message).not.toMatch(/exist|unknown|no such|wrong|invalid/i);
  });

  it("answers a Slug that could never exist exactly as it answers an unknown one", async () => {
    const unknown = await getHousehold("banana-apple-delicious-sauce");
    const nonsense = await getHousehold("not%20a%20slug");

    expect(nonsense.status).toBe(unknown.status);
    await expect(nonsense.json()).resolves.toEqual(await unknown.json());
  });
});
