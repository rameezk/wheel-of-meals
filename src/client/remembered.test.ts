import { afterEach, describe, expect, it, vi } from "vitest";
import { aSlug } from "./test-fixtures";
import { forget, remember, remembered } from "./remembered";

const storageThat = (storage: Partial<Storage>) =>
  vi.stubGlobal("localStorage", storage);

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("the remembered Household", () => {
  it("is nothing until one has been opened", () => {
    expect(remembered()).toBeNull();
  });

  it("is read back with the name it was remembered under", () => {
    remember({ slug: aSlug, name: "The Khans" });

    expect(remembered()).toEqual({ slug: aSlug, name: "The Khans" });
  });

  it("keeps only the last Household opened", () => {
    remember({ slug: aSlug, name: null });
    remember({ slug: "toast-jam-butter-plate", name: null });

    expect(remembered()).toEqual({
      slug: "toast-jam-butter-plate",
      name: null,
    });
  });

  it("is forgotten once it turns out to open nothing", () => {
    remember({ slug: aSlug, name: null });

    forget(aSlug);

    expect(remembered()).toBeNull();
  });

  it("survives another Slug turning out to open nothing", () => {
    remember({ slug: aSlug, name: null });

    forget("toast-jam-butter-plate");

    expect(remembered()).toEqual({ slug: aSlug, name: null });
  });

  it("is nothing when what was stored is not a Household", () => {
    localStorage.setItem("wheel-of-meals.household", "{ not json");

    expect(remembered()).toBeNull();
  });

  it("is nothing when what was stored is not a Slug", () => {
    localStorage.setItem(
      "wheel-of-meals.household",
      JSON.stringify({ slug: "nonsense", name: null }),
    );

    expect(remembered()).toBeNull();
  });

  it("is nothing when the browser refuses to hand over storage", () => {
    storageThat({
      getItem: () => {
        throw new Error("blocked");
      },
    });

    expect(remembered()).toBeNull();
  });

  it("goes quietly unremembered when the browser refuses to store it", () => {
    storageThat({
      setItem: () => {
        throw new Error("blocked");
      },
    });

    expect(() => remember({ slug: aSlug, name: null })).not.toThrow();
  });

  it("goes quietly unforgotten when the browser refuses to drop it", () => {
    storageThat({
      getItem: () => JSON.stringify({ slug: aSlug, name: null }),
      removeItem: () => {
        throw new Error("blocked");
      },
    });

    expect(() => forget(aSlug)).not.toThrow();
  });
});
