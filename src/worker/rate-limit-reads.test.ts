import { describe, expect, it } from "vitest";
import { tooManyRequests } from "../shared/api";
import {
  addMeal,
  ceiling,
  createdSlug,
  justPast,
  read,
  refused,
  times,
  withinOneWindow,
} from "./test-callers";

const aSlugNobodyHolds = "never-a-real-household";

const guessing = (ip: string) =>
  times(justPast(ceiling.reads), () => read(ip, aSlugNobodyHolds));

describe("rate limiting reads of a Household", () => {
  it("lets a family load their Household up to the ceiling", async () => {
    const slug = await createdSlug("203.0.113.10");

    expect(
      refused(
        await withinOneWindow(() =>
          times(ceiling.reads, () => read("203.0.113.10", slug)),
        ),
      ),
    ).toHaveLength(0);
  });

  it("refuses someone guessing Slugs, with a comprehensible 429", async () => {
    const [first] = refused(
      await withinOneWindow(() => guessing("203.0.113.11")),
    );

    expect(first).toBeDefined();
    expect(await first?.json()).toEqual(tooManyRequests);
  });

  it("counts separately from writes", async () => {
    const slug = await createdSlug("203.0.113.12");
    await guessing("203.0.113.12");

    expect((await addMeal("203.0.113.12", slug, "Ramen")).status).toBe(201);
  });
});
