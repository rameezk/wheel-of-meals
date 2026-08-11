import { describe, expect, it } from "vitest";
import { tooManyRequests } from "../shared/api";
import {
  addMeal,
  ceiling,
  create,
  createdSlug,
  justPast,
  read,
  refused,
  request,
  times,
  withinOneWindow,
} from "./test-callers";

const pastCreation = justPast(ceiling.creation);
const pastWrites = justPast(ceiling.writes);

describe("rate limiting Household creation", () => {
  it("refuses a burst with a comprehensible 429", async () => {
    const [first] = refused(
      await withinOneWindow(() =>
        times(pastCreation, () => create("203.0.113.1")),
      ),
    );

    expect(first).toBeDefined();
    expect(await first?.json()).toEqual(tooManyRequests);
  });

  it("leaves another caller alone", async () => {
    await times(pastCreation, () => create("203.0.113.2"));

    expect((await create("203.0.113.3")).status).toBe(201);
  });

  it("lets one caller create a Household up to the ceiling", async () => {
    expect(
      refused(
        await withinOneWindow(() =>
          times(ceiling.creation, () => create("203.0.113.4")),
        ),
      ),
    ).toHaveLength(0);
  });
});

describe("rate limiting Meal Bank writes", () => {
  it("refuses a burst with a comprehensible 429", async () => {
    const slug = await createdSlug("203.0.113.5");

    const [first] = refused(
      await withinOneWindow((attempt) =>
        times(pastWrites, (n) =>
          addMeal("203.0.113.5", slug, `Meal ${attempt}-${n}`),
        ),
      ),
    );

    expect(first).toBeDefined();
    expect(await first?.json()).toEqual(tooManyRequests);
  });

  it("lets a Household add Meals up to the ceiling", async () => {
    const slug = await createdSlug("203.0.113.8");

    expect(
      refused(
        await withinOneWindow((attempt) =>
          times(ceiling.writes, (n) =>
            addMeal("203.0.113.8", slug, `Meal ${attempt}-${n}`),
          ),
        ),
      ),
    ).toHaveLength(0);
  });

  it("counts separately from Household creation", async () => {
    const slug = await createdSlug("203.0.113.6");
    await times(pastCreation, () => create("203.0.113.6"));

    expect((await addMeal("203.0.113.6", slug, "Ramen")).status).toBe(201);
  });
});

describe("saving a Meal whole", () => {
  it("is counted against the same writes as the rest of the Meal Bank", async () => {
    const slug = await createdSlug("203.0.113.10");

    const responses = await withinOneWindow(() =>
      times(pastWrites, (n) =>
        request(
          `/api/households/${slug}/meals/meal-${n}`,
          "PATCH",
          "203.0.113.10",
        ),
      ),
    );

    expect(refused(responses).length).toBeGreaterThan(0);
  });
});

describe("a write to a path that routes nowhere", () => {
  it("is still counted, so a crawler cannot probe for free", async () => {
    const responses = await withinOneWindow(() =>
      times(pastWrites, (n) =>
        request(`/api/nothing/${n}`, "POST", "203.0.113.9"),
      ),
    );

    expect(refused(responses).length).toBeGreaterThan(0);
  });
});

describe("a request that did not arrive through Cloudflare", () => {
  it("is left alone, having no caller to count against", async () => {
    const responses = await times(pastCreation, () =>
      request("/api/households", "POST"),
    );

    expect(refused(responses)).toHaveLength(0);
  });
});

describe("a caller who has used up their writes", () => {
  it("can still read the Household they were working on", async () => {
    const slug = await createdSlug("203.0.113.7");
    await times(pastCreation, () => create("203.0.113.7"));

    expect((await read("203.0.113.7", slug)).status).toBe(200);
  });
});
