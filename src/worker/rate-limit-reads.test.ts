import { describe, expect, it } from "vitest";
import { tooManyRequests } from "../shared/api";
import {
  addMeal,
  createdSlug,
  read,
  refused,
  times,
  withinOneWindow,
} from "./test-callers";

const aSlugNobodyHolds = "never-a-real-household";

const guessing = (ip: string) => times(350, () => read(ip, aSlugNobodyHolds));

describe("rate limiting reads of a Household", () => {
  it("allows far more page loads than a family ever makes", async () => {
    const slug = await createdSlug("203.0.113.10");

    expect(
      refused(await times(50, () => read("203.0.113.10", slug))),
    ).toHaveLength(0);
  }, 30_000);

  it("refuses someone guessing Slugs, with a comprehensible 429", async () => {
    const [first] = refused(
      await withinOneWindow(() => guessing("203.0.113.11")),
    );

    expect(first).toBeDefined();
    expect(await first?.json()).toEqual(tooManyRequests);
  }, 90_000);

  it("counts separately from writes", async () => {
    const slug = await createdSlug("203.0.113.12");
    await guessing("203.0.113.12");

    expect((await addMeal("203.0.113.12", slug, "Ramen")).status).toBe(201);
  }, 90_000);
});
