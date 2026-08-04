import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { tooManyRequests } from "../shared/api";

const origin = "https://example.com";

const from = (ip: string) => ({ "cf-connecting-ip": ip });

const create = (ip: string) =>
  SELF.fetch(`${origin}/api/households`, {
    method: "POST",
    headers: from(ip),
  });

const createdSlug = async (ip: string) => {
  const body = await (await create(ip)).json<{ slug: string }>();
  return body.slug;
};

const addMeal = (ip: string, slug: string, name: string) =>
  SELF.fetch(`${origin}/api/households/${slug}/meals`, {
    method: "POST",
    headers: { "content-type": "application/json", ...from(ip) },
    body: JSON.stringify({ name }),
  });

const until = async (
  attempt: (n: number) => Promise<Response>,
  ceiling: number,
) => {
  for (let n = 0; n < ceiling; n++) {
    const response = await attempt(n);
    if (response.status === 429) return { at: n, response };
  }
  return null;
};

describe("rate limiting Household creation", () => {
  it("refuses a burst with a comprehensible 429", async () => {
    const limited = await until(() => create("203.0.113.1"), 40);

    expect(limited).not.toBeNull();
    expect(await limited?.response.json()).toEqual(tooManyRequests);
  });

  it("leaves a second household alone", async () => {
    await until(() => create("203.0.113.2"), 40);

    expect((await create("203.0.113.3")).status).toBe(201);
  });

  it("allows a household to be created a handful of times over", async () => {
    const limited = await until(() => create("203.0.113.4"), 40);

    expect(limited?.at).toBeGreaterThanOrEqual(10);
  });
});

describe("rate limiting Meal Bank writes", () => {
  it("refuses a burst with a comprehensible 429", async () => {
    const slug = await createdSlug("203.0.113.5");

    const limited = await until(
      (n) => addMeal("203.0.113.5", slug, `Meal ${n}`),
      300,
    );

    expect(limited).not.toBeNull();
    expect(await limited?.response.json()).toEqual(tooManyRequests);
  });

  it("allows far more of them than a Household ever adds by hand", async () => {
    const slug = await createdSlug("203.0.113.8");

    const limited = await until(
      (n) => addMeal("203.0.113.8", slug, `Meal ${n}`),
      300,
    );

    expect(limited?.at).toBeGreaterThanOrEqual(60);
  });

  it("counts separately from Household creation", async () => {
    const slug = await createdSlug("203.0.113.6");
    await until(() => create("203.0.113.6"), 40);

    expect((await addMeal("203.0.113.6", slug, "Ramen")).status).toBe(201);
  });
});

describe("a write to a path that routes nowhere", () => {
  it("is still counted, so a crawler cannot probe for free", async () => {
    const limited = await until(
      (n) =>
        SELF.fetch(`${origin}/api/nothing/${n}`, {
          method: "POST",
          headers: from("203.0.113.9"),
        }),
      300,
    );

    expect(limited).not.toBeNull();
  });
});

describe("a request that did not arrive through Cloudflare", () => {
  it("is left alone, having no caller to count against", async () => {
    const limited = await until(
      () => SELF.fetch(`${origin}/api/households`, { method: "POST" }),
      20,
    );

    expect(limited).toBeNull();
  });
});

describe("rate limiting reads", () => {
  it("leaves them alone", async () => {
    const slug = await createdSlug("203.0.113.7");
    await until(() => create("203.0.113.7"), 40);

    const responses = await Promise.all(
      Array.from({ length: 50 }, () =>
        SELF.fetch(`${origin}/api/households/${slug}`, {
          headers: from("203.0.113.7"),
        }),
      ),
    );

    expect(responses.every((response) => response.ok)).toBe(true);
  });
});
