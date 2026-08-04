import { SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultCookingDays,
  householdNameMaxLength,
} from "../shared/household";
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

const updateHousehold = async (slug: string, changes: unknown) => {
  const response = await SELF.fetch(`${origin}/api/households/${slug}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(changes),
  });
  return { response, body: await response.json<Record<string, unknown>>() };
};

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

describe("updating a Household", () => {
  it("takes a name and remembers it", async () => {
    const { body: created } = await createHousehold();

    const { response, body } = await updateHousehold(String(created.slug), {
      name: "The Khans",
    });

    expect(response.status).toBe(200);
    expect(body.name).toBe("The Khans");
    await expect(
      (await getHousehold(String(created.slug))).json(),
    ).resolves.toMatchObject({ name: "The Khans" });
  });

  it("takes any subset of the seven days as its Cooking Days", async () => {
    const { body: created } = await createHousehold();

    const { response, body } = await updateHousehold(String(created.slug), {
      cookingDays: ["saturday", "monday"],
    });

    expect(response.status).toBe(200);
    expect(body.cookingDays).toEqual(["monday", "saturday"]);
  });

  it("refuses a Household with no Cooking Days", async () => {
    const { body: created } = await createHousehold();

    const { response, body } = await updateHousehold(String(created.slug), {
      cookingDays: [],
    });

    expect(response.status).toBe(400);
    expect(String(body.message)).toMatch(/at least one day/i);
    await expect(
      (await getHousehold(String(created.slug))).json(),
    ).resolves.toMatchObject({ cookingDays: defaultCookingDays });
  });

  it("refuses a day that is not a day of the week", async () => {
    const { body: created } = await createHousehold();

    const { response } = await updateHousehold(String(created.slug), {
      cookingDays: ["someday"],
    });

    expect(response.status).toBe(400);
  });

  it("changes the name again later, and clears it back to nothing", async () => {
    const { body: created } = await createHousehold();
    const slug = String(created.slug);

    await updateHousehold(slug, { name: "The Khans" });
    const renamed = await updateHousehold(slug, { name: "The Khan Household" });
    expect(renamed.body.name).toBe("The Khan Household");

    const cleared = await updateHousehold(slug, { name: "  " });
    expect(cleared.body.name).toBeNull();
  });

  it("leaves the Cooking Days alone when only the name changes", async () => {
    const { body: created } = await createHousehold();
    const slug = String(created.slug);

    await updateHousehold(slug, { cookingDays: ["friday"] });
    const { body } = await updateHousehold(slug, { name: "The Khans" });

    expect(body.cookingDays).toEqual(["friday"]);
  });

  it("leaves the name alone when only the Cooking Days change", async () => {
    const { body: created } = await createHousehold();
    const slug = String(created.slug);

    await updateHousehold(slug, { name: "The Khans" });
    const { body } = await updateHousehold(slug, { cookingDays: ["friday"] });

    expect(body.name).toBe("The Khans");
  });

  it("answers with the whole Household, Meal Bank included", async () => {
    const { body: created } = await createHousehold();
    const slug = String(created.slug);
    await SELF.fetch(`${origin}/api/households/${slug}/meals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Butter chicken" }),
    });

    const { body } = await updateHousehold(slug, { name: "The Khans" });

    expect(body.mealBank).toMatchObject([{ name: "Butter chicken" }]);
  });

  it("refuses a name longer than the cap", async () => {
    const { body: created } = await createHousehold();

    const { response } = await updateHousehold(String(created.slug), {
      name: "a".repeat(householdNameMaxLength + 1),
    });

    expect(response.status).toBe(400);
  });

  it("answers an unknown Slug with the same 404 a lookup gives", async () => {
    const { response } = await updateHousehold("banana-apple-delicious-sauce", {
      name: "The Khans",
    });

    expect(response.status).toBe(404);
  });
});
