import { afterEach, describe, expect, it, vi } from "vitest";
import { firstRunSkipped, skipFirstRun } from "./guiding";
import { aSlug } from "./test-fixtures";

const key = "wheel-of-meals.first-run-skipped";

const anotherSlug = "toast-jam-butter-plate";

const storageThat = (storage: Partial<Storage>) =>
  vi.stubGlobal("localStorage", storage);

const stored = (): unknown => JSON.parse(localStorage.getItem(key) ?? "null");

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("skipping the first run", () => {
  it("has not happened for a Household nobody has skipped", () => {
    expect(firstRunSkipped(aSlug)).toBe(false);
  });

  it("is remembered, so the guide does not come back on the next visit", () => {
    skipFirstRun(aSlug);

    expect(firstRunSkipped(aSlug)).toBe(true);
  });

  it("says nothing about a Household that was never skipped", () => {
    skipFirstRun(aSlug);

    expect(firstRunSkipped(anotherSlug)).toBe(false);
  });

  it("holds several Households at once, so each is skipped on its own", () => {
    skipFirstRun(aSlug);
    skipFirstRun(anotherSlug);

    expect(firstRunSkipped(aSlug)).toBe(true);
    expect(firstRunSkipped(anotherSlug)).toBe(true);
  });

  it("counts the same Household once, however often it is skipped", () => {
    skipFirstRun(aSlug);
    skipFirstRun(aSlug);

    expect(stored()).toEqual([aSlug]);
  });

  it("is nothing when what was stored is not a list of Slugs", () => {
    localStorage.setItem(key, JSON.stringify(["nonsense"]));

    expect(firstRunSkipped(aSlug)).toBe(false);
  });

  it("is nothing when what was stored is not JSON at all", () => {
    localStorage.setItem(key, "[ not json");

    expect(firstRunSkipped(aSlug)).toBe(false);
  });

  it("is nothing when the browser refuses to hand over storage", () => {
    storageThat({
      getItem: () => {
        throw new Error("blocked");
      },
    });

    expect(firstRunSkipped(aSlug)).toBe(false);
  });

  it("goes quietly unremembered when the browser refuses to store it", () => {
    storageThat({
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    });

    expect(() => skipFirstRun(aSlug)).not.toThrow();
  });
});
