import { describe, expect, it } from "vitest";
import { routeFromPath } from "./route";
import { aSlug } from "./test-fixtures";

describe("the route a path names", () => {
  it("opens the Household view at a bare Slug", () => {
    expect(routeFromPath(`/${aSlug}`)).toEqual({
      slug: aSlug,
      view: "household",
    });
  });

  it("opens the settings view under the Slug", () => {
    expect(routeFromPath(`/${aSlug}/settings`)).toEqual({
      slug: aSlug,
      view: "settings",
    });
  });

  it("opens the Meal Bank view under the Slug", () => {
    expect(routeFromPath(`/${aSlug}/meal-bank`)).toEqual({
      slug: aSlug,
      view: "meal-bank",
    });
  });

  it("ignores surrounding slashes", () => {
    expect(routeFromPath(`//${aSlug}/settings//`)).toEqual({
      slug: aSlug,
      view: "settings",
    });
  });

  it("has no route for the root", () => {
    expect(routeFromPath("/")).toBeNull();
  });

  it("has no route for a first segment that is not a Slug", () => {
    expect(routeFromPath("/nonsense")).toBeNull();
  });

  it("has no route for an unrecognised second segment", () => {
    expect(routeFromPath(`/${aSlug}/nonsense`)).toBeNull();
  });

  it("has no route for a path with a third segment", () => {
    expect(routeFromPath(`/${aSlug}/settings/deeper`)).toBeNull();
  });
});
