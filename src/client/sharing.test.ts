import { afterEach, describe, expect, it } from "vitest";
import type { Recipe } from "../shared/recipe";
import type { Week } from "../shared/week";
import {
  householdLink,
  recipeAsShareable,
  shareOrCopy,
  weekAsText,
} from "./sharing";
import {
  aMealWithARecipe,
  aRecipe,
  aSlug,
  aSource,
  withAClipboard,
  withAShareSheet,
  withNoSharing,
} from "./test-fixtures";

const refusedWith = (name: string) => {
  const refusal = new Error("no");
  refusal.name = name;
  return refusal;
};

afterEach(withNoSharing);

const aWeek: Week = [
  {
    day: "sunday",
    meal: { id: "1", name: "Butter chicken", description: null, recipe: null },
  },
  {
    day: "monday",
    meal: { id: "2", name: "Lasagne", description: null, recipe: null },
  },
];

describe("a Week as text", () => {
  it("labels every Cooking Day, one to a line", () => {
    expect(weekAsText(aWeek)).toBe("Sunday: Butter chicken\nMonday: Lasagne");
  });

  it("leaves the days a thin Week could not fill blank but labelled", () => {
    expect(weekAsText([...aWeek, { day: "tuesday", meal: null }])).toBe(
      "Sunday: Butter chicken\nMonday: Lasagne\nTuesday: -",
    );
  });

  it("says nothing about the days the Household does not cook", () => {
    expect(weekAsText(aWeek)).not.toContain("Friday");
  });
});

describe("a Recipe as something to share", () => {
  const lambCurryWith = (recipe: Recipe) =>
    recipeAsShareable(aMealWithARecipe.name, recipe);

  it("leads with the Meal's name, then the parts the cook wrote", () => {
    const shareable = lambCurryWith(
      aRecipe({
        source: aSource,
        ingredients: "1 onion, chopped",
        method: "Fry the paste.",
      }),
    );

    expect(shareable).toEqual({
      title: "Lamb curry",
      text: "Lamb curry\n\n1 onion, chopped\n\nFry the paste.",
      url: aSource,
    });
  });

  it("shares a Recipe that is only a Source as that link", () => {
    expect(lambCurryWith(aRecipe({ source: aSource }))).toEqual({
      title: "Lamb curry",
      text: "Lamb curry",
      url: aSource,
    });
  });

  it("shares a Recipe that is only a Method as that text", () => {
    expect(lambCurryWith(aRecipe({ method: "Fry the paste." }))).toEqual({
      title: "Lamb curry",
      text: "Lamb curry\n\nFry the paste.",
      url: undefined,
    });
  });

  it("shares a Recipe that is only Ingredients as that list", () => {
    expect(lambCurryWith(aRecipe({ ingredients: "1 onion" }))).toEqual({
      title: "Lamb curry",
      text: "Lamb curry\n\n1 onion",
      url: undefined,
    });
  });

  it("keeps the line breaks a list and a set of steps were written with", () => {
    const shareable = lambCurryWith(
      aRecipe({
        ingredients: "1 onion, chopped\n2 tbsp butter",
        method: "Fry the paste.\n\nSimmer for an hour.",
      }),
    );

    expect(shareable.text).toBe(
      "Lamb curry\n\n1 onion, chopped\n2 tbsp butter\n\nFry the paste.\n\nSimmer for an hour.",
    );
  });

  it("says nothing that would name the Household", () => {
    const shareable = lambCurryWith(
      aRecipe({
        source: aSource,
        ingredients: "1 onion, chopped",
        method: "Fry the paste.",
      }),
    );

    const whole = [shareable.title, shareable.text, shareable.url].join("\n");
    expect(whole).not.toContain(aSlug);
    expect(whole).not.toContain(location.origin);
  });
});

describe("a Household link", () => {
  it("is the whole address a Slug opens, not the path on its own", () => {
    expect(householdLink("banana-apple-delicious-sauce")).toBe(
      `${location.origin}/banana-apple-delicious-sauce`,
    );
  });
});

describe("sharing", () => {
  it("hands the share sheet the text where there is one", async () => {
    const share = withAShareSheet();
    const writeText = withAClipboard();

    expect(await shareOrCopy({ title: "The Week", text: "Sunday: -" })).toBe(
      "shared",
    );
    expect(share).toHaveBeenCalledWith({
      title: "The Week",
      text: "Sunday: -",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies to the clipboard where there is no share sheet", async () => {
    const writeText = withAClipboard();

    expect(await shareOrCopy({ title: "The Week", text: "Sunday: -" })).toBe(
      "copied",
    );
    expect(writeText).toHaveBeenCalledWith("Sunday: -");
  });

  it("copies the link when that is all there is to share", async () => {
    const writeText = withAClipboard();

    await shareOrCopy({ title: "Ours", url: "https://example.test/slug" });

    expect(writeText).toHaveBeenCalledWith("https://example.test/slug");
  });

  it("copies the text and the link together when there are both", async () => {
    const writeText = withAClipboard();

    await shareOrCopy({
      title: "Ours",
      text: "Sunday: -",
      url: "https://example.test/slug",
    });

    expect(writeText).toHaveBeenCalledWith(
      "Sunday: -\nhttps://example.test/slug",
    );
  });

  it("takes a dismissed share sheet as a decision, not a failure to copy", async () => {
    const share = withAShareSheet();
    share.mockRejectedValue(refusedWith("AbortError"));
    const writeText = withAClipboard();

    expect(await shareOrCopy({ title: "The Week", text: "Sunday: -" })).toBe(
      "cancelled",
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the share sheet breaks", async () => {
    const share = withAShareSheet();
    share.mockRejectedValue(refusedWith("NotAllowedError"));
    const writeText = withAClipboard();

    expect(await shareOrCopy({ title: "The Week", text: "Sunday: -" })).toBe(
      "copied",
    );
    expect(writeText).toHaveBeenCalledWith("Sunday: -");
  });

  it("owns up when neither the share sheet nor the clipboard will have it", async () => {
    const writeText = withAClipboard();
    writeText.mockRejectedValue(refusedWith("NotAllowedError"));

    expect(await shareOrCopy({ title: "The Week", text: "Sunday: -" })).toBe(
      "failed",
    );
  });

  it("owns up on a browser that offers neither", async () => {
    expect(await shareOrCopy({ title: "The Week", text: "Sunday: -" })).toBe(
      "failed",
    );
  });
});
