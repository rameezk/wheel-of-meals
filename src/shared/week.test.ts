import { describe, expect, it } from "vitest";
import type { CookingDay } from "./household";
import type { Meal } from "./meal";
import { respin, spareMeals, spin, type Random, type Week } from "./week";

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

describe("the spare Meals", () => {
  it("are the Meals the Week has not drawn", () => {
    const mealBank = aBankOf(7);
    const week = spin(mealBank, everyDay, always(0));

    const spare = spareMeals(week, mealBank);

    expect(spare.map(({ id }) => id)).toEqual(["meal-5", "meal-6"]);
  });

  it("run out when the Meal Bank is exactly as big as the Week", () => {
    const mealBank = aBankOf(5);
    const week = spin(mealBank, everyDay, always(0));

    expect(spareMeals(week, mealBank)).toEqual([]);
  });

  it("run out when the Meal Bank is thinner than the Week", () => {
    const mealBank = aBankOf(2);
    const week = spin(mealBank, everyDay, always(0));

    expect(spareMeals(week, mealBank)).toEqual([]);
  });

  it("are the whole Meal Bank before anything is drawn", () => {
    const mealBank = aBankOf(3);
    const week: Week = everyDay.map((day) => ({ day, meal: null }));

    expect(spareMeals(week, mealBank)).toEqual(mealBank);
  });
});

describe("a re-spin", () => {
  it("draws a different Meal onto the day it is given", () => {
    const mealBank = aBankOf(6);
    const week = spin(mealBank, everyDay, always(0));

    const respun = respin(week, "tuesday", mealBank, always(0));

    expect(respun[2]?.day).toBe("tuesday");
    expect(respun[2]?.meal).not.toEqual(week[2]?.meal);
    expect(mealBank).toContain(respun[2]?.meal);
  });

  it("leaves every other day untouched", () => {
    const mealBank = aBankOf(6);
    const week = spin(mealBank, everyDay, always(0));

    const respun = respin(week, "tuesday", mealBank, always(0));

    expect(respun.filter(({ day }) => day !== "tuesday")).toEqual(
      week.filter(({ day }) => day !== "tuesday"),
    );
  });

  it("never draws a Meal the Week already holds", () => {
    const mealBank = aBankOf(8);
    const week = spin(mealBank, everyDay, cycling(0.1, 0.7, 0.3, 0.9, 0.5));

    for (const draw of [0, 0.25, 0.5, 0.75, 0.99]) {
      const respun = respin(week, "wednesday", mealBank, always(draw));

      const drawn = respun.map(({ meal }) => meal?.id);
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  it("leaves the Week alone when the Meal Bank offers no alternative", () => {
    const mealBank = aBankOf(5);
    const week = spin(mealBank, everyDay, always(0));

    expect(respin(week, "tuesday", mealBank, always(0))).toBe(week);
  });

  it("leaves an empty day in a thin Week empty, having nothing to fill it with", () => {
    const mealBank = aBankOf(2);
    const week = spin(mealBank, everyDay, always(0));

    expect(respin(week, "thursday", mealBank, always(0))).toBe(week);
  });

  it("fills an empty day once the Meal Bank has a Meal to spare", () => {
    const spare: Meal = { id: "extra", name: "Extra", description: null };
    const week = spin(aBankOf(2), everyDay, always(0));

    const respun = respin(week, "thursday", [...aBankOf(2), spare], always(0));

    expect(respun[4]).toEqual({ day: "thursday", meal: spare });
  });

  it("leaves the Week alone when the day is not one it holds", () => {
    const mealBank = aBankOf(8);
    const week = spin(mealBank, everyDay, always(0));

    expect(respin(week, "saturday", mealBank, always(0))).toBe(week);
  });

  it("takes its randomness from the source it is given", () => {
    const mealBank = aBankOf(9);
    const week = spin(mealBank, everyDay, always(0));

    const one = respin(week, "monday", mealBank, always(0));
    const other = respin(week, "monday", mealBank, always(0.99));

    expect(one).not.toEqual(other);
    expect(respin(week, "monday", mealBank, always(0))).toEqual(one);
  });
});
