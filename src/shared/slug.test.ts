import { describe, expect, it } from "vitest";
import { foodWords, generateSlug, readSlug, slugSchema } from "./slug";

const cycling = (...values: number[]) => {
  let next = 0;
  return () => values[next++ % values.length] ?? 0;
};

describe("a Slug", () => {
  it("is four food words joined by dashes", () => {
    const slug = generateSlug(cycling(0));

    expect(slug).toBe(
      [foodWords[0], foodWords[1], foodWords[2], foodWords[3]].join("-"),
    );
  });

  it("never repeats a word within itself", () => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const words = generateSlug(Math.random).split("-");

      expect(new Set(words).size).toBe(4);
    }
  });

  it("draws every word from the food wordlist", () => {
    for (let attempt = 0; attempt < 500; attempt++) {
      for (const word of generateSlug(Math.random).split("-")) {
        expect(foodWords).toContain(word);
      }
    }
  });
});

describe("the food wordlist", () => {
  it("holds no duplicates", () => {
    expect(new Set(foodWords).size).toBe(foodWords.length);
  });

  it("holds only lowercase letters, so a Slug survives being read aloud", () => {
    for (const word of foodWords) {
      expect(word).toMatch(/^[a-z]+$/);
    }
  });

  it("is large enough that four words are hard to guess", () => {
    expect(foodWords.length).toBeGreaterThanOrEqual(100);
  });
});

describe("reading a typed Slug", () => {
  const expected = "banana-apple-delicious-sauce";

  it("reads it back as it was written", () => {
    expect(readSlug(expected)).toBe(expected);
  });

  it("forgives surrounding whitespace and casing", () => {
    expect(readSlug("  Banana-Apple-DELICIOUS-sauce\n")).toBe(expected);
  });

  it("takes the four words separated by spaces", () => {
    expect(readSlug("banana apple delicious sauce")).toBe(expected);
  });

  it("takes whatever mixture of spaces and dashes was typed", () => {
    expect(readSlug("banana - apple  delicious-sauce")).toBe(expected);
  });

  it("refuses anything that is not four words", () => {
    for (const typed of [
      "banana apple delicious",
      "banana apple delicious sauce extra",
      "banana_apple_delicious_sauce",
      "banana apple delicious s4uce",
      "'; DROP TABLE households; --",
      "   ",
      "",
    ]) {
      expect(readSlug(typed)).toBeNull();
    }
  });
});

describe("the Slug schema", () => {
  it("accepts a generated Slug", () => {
    expect(slugSchema.safeParse(generateSlug(Math.random)).success).toBe(true);
  });

  it("rejects anything that is not four dashed lowercase words", () => {
    for (const candidate of [
      "banana-apple-delicious",
      "banana-apple-delicious-sauce-extra",
      "Banana-Apple-Delicious-Sauce",
      "banana apple delicious sauce",
      "banana--apple-delicious-sauce",
      "'; DROP TABLE households; --",
      "",
    ]) {
      expect(slugSchema.safeParse(candidate).success).toBe(false);
    }
  });
});
