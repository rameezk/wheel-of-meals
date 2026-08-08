import { describe, expect, it } from "vitest";
import { ceilings, environmentNames, limiterNamesIn } from "./ceilings";

const production = ceilings();

const aBusyWeekOfPageLoads = 50;
const aLongSittingAtTheMealBank = 40;
const enoughHouseholdsForOneFamily = 5;

describe("the production ceilings", () => {
  it("lets a family load their Household far more often than they ever would", () => {
    expect(production.HOUSEHOLD_READS.limit).toBeGreaterThan(
      aBusyWeekOfPageLoads,
    );
  });

  it("lets a Household change more Meals in a minute than anyone types by hand", () => {
    expect(production.HOUSEHOLD_WRITES.limit).toBeGreaterThan(
      aLongSittingAtTheMealBank,
    );
  });

  it("lets a family make the few Households they need, and no flood", () => {
    expect(production.HOUSEHOLD_CREATION.limit).toBeGreaterThan(
      enoughHouseholdsForOneFamily,
    );
    expect(production.HOUSEHOLD_CREATION.limit).toBeLessThan(
      production.HOUSEHOLD_WRITES.limit,
    );
  });

  it("counts reads, writes and creation against separate ceilings", () => {
    const limits = [
      production.HOUSEHOLD_READS.limit,
      production.HOUSEHOLD_WRITES.limit,
      production.HOUSEHOLD_CREATION.limit,
    ];

    expect(new Set(limits).size).toBe(limits.length);
  });

  it("measures every ceiling over the same minute", () => {
    const periods = Object.values(production).map(({ period }) => period);

    expect(new Set(periods)).toEqual(new Set([60]));
  });
});

describe("every environment", () => {
  it.each(environmentNames())(
    "%s names the same three ceilings as production",
    (environment) => {
      expect(limiterNamesIn(environment)).toEqual(limiterNamesIn());
    },
  );
});

describe("the preview ceilings", () => {
  it("match production, so a preview refuses what production refuses", () => {
    expect(ceilings("preview")).toEqual(production);
  });
});

describe("the test ceilings", () => {
  const test = ceilings("test");

  it("sit low enough that a burst past them stays a handful of requests", () => {
    const highest = Math.max(...Object.values(test).map(({ limit }) => limit));

    expect(highest).toBeLessThan(20);
  });

  it("keep production's ordering, so the suite exercises the real shape", () => {
    expect(test.HOUSEHOLD_CREATION.limit).toBeLessThan(
      test.HOUSEHOLD_WRITES.limit,
    );
    expect(test.HOUSEHOLD_WRITES.limit).toBeLessThan(
      test.HOUSEHOLD_READS.limit,
    );
  });
});
