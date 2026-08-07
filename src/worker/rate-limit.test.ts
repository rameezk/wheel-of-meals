import { describe, expect, it } from "vitest";
import { tooManyRequests } from "../shared/api";
import {
  addMeal,
  create,
  createdSlug,
  read,
  refused,
  request,
  times,
  withinOneWindow,
} from "./test-callers";

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
      times(150, (n) => request(`/api/nothing/${n}`, "POST", "203.0.113.9")),
    );

    expect(refused(responses).length).toBeGreaterThan(0);
  }, 60_000);
});

describe("a request that did not arrive through Cloudflare", () => {
  it("is left alone, having no caller to count against", async () => {
    const responses = await times(30, () => request("/api/households", "POST"));

    expect(refused(responses)).toHaveLength(0);
  });
});

describe("a caller who has used up their writes", () => {
  it("can still read the Household they were working on", async () => {
    const slug = await createdSlug("203.0.113.7");
    await times(30, () => create("203.0.113.7"));

    expect((await read("203.0.113.7", slug)).status).toBe(200);
  });
});
