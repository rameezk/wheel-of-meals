import { describe, expect, it } from "vitest";
import type { CookingDay } from "./household";
import type { Meal } from "./meal";
import { spin, type Random } from "./week";

const aBankOf = (size: number): Meal[] =>
  Array.from({ length: size }, (_, index) => ({
    id: `meal-${index}`,
    name: `Meal ${index}`,
    description: null,
  }));

const everyDay: CookingDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

const always =
  (value: number): Random =>
  () =>
    value;

const cycling = (...values: number[]): Random => {
  let next = 0;
  return () => values[next++ % values.length] ?? 0;
};

describe("a Spin", () => {
  it("draws a Meal for every Cooking Day", () => {
    const week = spin(aBankOf(8), everyDay, cycling(0.1, 0.7, 0.3, 0.9, 0.5));

    expect(week.map(({ day }) => day)).toEqual(everyDay);
    for (const { meal } of week) expect(meal).not.toBeNull();
  });

  it("never draws the same Meal twice", () => {
    const week = spin(aBankOf(6), everyDay, cycling(0.2, 0.8, 0.4, 0.6, 0.0));

    const drawn = week.map(({ meal }) => meal?.id);
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it("fills only the days the Household cooks, in the order of the week", () => {
    const week = spin(aBankOf(4), ["friday", "monday"], always(0));

    expect(week.map(({ day }) => day)).toEqual(["monday", "friday"]);
  });

  it("leaves the days a thin Meal Bank cannot fill empty", () => {
    const week = spin(aBankOf(2), everyDay, cycling(0.5, 0.5));

    expect(week.filter(({ meal }) => meal !== null)).toHaveLength(2);
    expect(week.filter(({ meal }) => meal === null)).toHaveLength(3);
  });

  it("gives an empty Meal Bank a Week of empty days", () => {
    const week = spin([], everyDay, always(0));

    expect(week).toHaveLength(everyDay.length);
    for (const { meal } of week) expect(meal).toBeNull();
  });

  it("draws only Meals the Meal Bank holds", () => {
    const mealBank = aBankOf(7);

    const week = spin(mealBank, everyDay, cycling(0.9, 0.1, 0.6, 0.2, 0.4));

    for (const { meal } of week) expect(mealBank).toContain(meal);
  });

  it("takes its randomness from the source it is given", () => {
    const mealBank = aBankOf(10);

    const one = spin(mealBank, everyDay, always(0));
    const other = spin(mealBank, everyDay, always(0.99));

    expect(one).not.toEqual(other);
    expect(spin(mealBank, everyDay, always(0))).toEqual(one);
  });
});
