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

const times = (count: number, attempt: (n: number) => Promise<Response>) =>
  Promise.all(Array.from({ length: count }, (_, n) => attempt(n)));

const refused = (responses: Response[]) =>
  responses.filter((response) => response.status === 429);

const rateLimitPeriod = 60_000;

const currentWindow = () => Math.floor(Date.now() / rateLimitPeriod);

const withinOneWindow = async (
  burst: (attempt: number) => Promise<Response[]>,
) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const opened = currentWindow();
    const responses = await burst(attempt);
    if (currentWindow() === opened) return responses;
  }

  throw new Error(
    "The rate limit window turned during all three bursts, so none of them was counted as one",
  );
};

describe("rate limiting Household creation", () => {
  it("refuses a burst with a comprehensible 429", async () => {
    const [first] = refused(
      await withinOneWindow(() => times(30, () => create("203.0.113.1"))),
    );

    expect(first).toBeDefined();
    expect(await first?.json()).toEqual(tooManyRequests);
  });

  it("leaves another caller alone", async () => {
    await times(30, () => create("203.0.113.2"));

    expect((await create("203.0.113.3")).status).toBe(201);
  });

  it("lets one caller create a Household several times over", async () => {
    expect(refused(await times(10, () => create("203.0.113.4")))).toHaveLength(
      0,
    );
  });
});

describe("rate limiting Meal Bank writes", () => {
  it("refuses a burst with a comprehensible 429", async () => {
    const slug = await createdSlug("203.0.113.5");

    const [first] = refused(
      await withinOneWindow((attempt) =>
        times(150, (n) => addMeal("203.0.113.5", slug, `Meal ${attempt}-${n}`)),
      ),
    );

    expect(first).toBeDefined();
    expect(await first?.json()).toEqual(tooManyRequests);
  }, 60_000);

  it("allows far more of them than a Household ever adds by hand", async () => {
    const slug = await createdSlug("203.0.113.8");

    const responses = await times(60, (n) =>
      addMeal("203.0.113.8", slug, `Meal ${n}`),
    );

    expect(refused(responses)).toHaveLength(0);
  }, 30_000);

  it("counts separately from Household creation", async () => {
    const slug = await createdSlug("203.0.113.6");
    await times(30, () => create("203.0.113.6"));

    expect((await addMeal("203.0.113.6", slug, "Ramen")).status).toBe(201);
  });
});

describe("a write to a path that routes nowhere", () => {
  it("is still counted, so a crawler cannot probe for free", async () => {
    const responses = await withinOneWindow(() =>
      times(150, (n) =>
        SELF.fetch(`${origin}/api/nothing/${n}`, {
          method: "POST",
          headers: from("203.0.113.9"),
        }),
      ),
    );

    expect(refused(responses).length).toBeGreaterThan(0);
  }, 60_000);
});

describe("a request that did not arrive through Cloudflare", () => {
  it("is left alone, having no caller to count against", async () => {
    const responses = await times(30, () =>
      SELF.fetch(`${origin}/api/households`, { method: "POST" }),
    );

    expect(refused(responses)).toHaveLength(0);
  });
});

describe("rate limiting reads", () => {
  it("leaves them alone", async () => {
    const slug = await createdSlug("203.0.113.7");
    await times(30, () => create("203.0.113.7"));

    const responses = await times(50, () =>
      SELF.fetch(`${origin}/api/households/${slug}`, {
        headers: from("203.0.113.7"),
      }),
    );

    expect(responses.every((response) => response.ok)).toBe(true);
  }, 30_000);
});
