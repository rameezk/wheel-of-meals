import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const origin = "https://example.com";

type Body = Record<string, unknown>;

const aHousehold = async () => {
  const response = await SELF.fetch(`${origin}/api/households`, {
    method: "POST",
  });
  const { slug } = await response.json<{ slug: string }>();
  return slug;
};

const addMeal = async (slug: string, meal: unknown) => {
  const response = await SELF.fetch(`${origin}/api/households/${slug}/meals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(meal),
  });
  return { response, body: await response.json<Body>() };
};

const editMeal = async (slug: string, id: string, changes: unknown) => {
  const response = await SELF.fetch(
    `${origin}/api/households/${slug}/meals/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(changes),
    },
  );
  return { response, body: await response.json<Body>() };
};

const deleteMeal = (slug: string, id: string) =>
  SELF.fetch(`${origin}/api/households/${slug}/meals/${id}`, {
    method: "DELETE",
  });

const mealBank = async (slug: string) => {
  const response = await SELF.fetch(`${origin}/api/households/${slug}`);
  const { mealBank } = await response.json<{ mealBank: Body[] }>();
  return mealBank;
};

describe("adding a Meal", () => {
  it("puts it in the Household's Meal Bank", async () => {
    const slug = await aHousehold();

    const { response, body } = await addMeal(slug, {
      name: "Butter chicken",
      description: "The one with the coconut milk",
    });

    expect(response.status).toBe(201);
    expect(typeof body.id).toBe("string");
    expect(body.name).toBe("Butter chicken");
    expect(body.description).toBe("The one with the coconut milk");
    await expect(mealBank(slug)).resolves.toEqual([body]);
  });

  it("keeps the description optional", async () => {
    const slug = await aHousehold();

    const { response, body } = await addMeal(slug, { name: "Lasagne" });

    expect(response.status).toBe(201);
    expect(body.description).toBeNull();
  });

  it("refuses a Meal already in the Bank, whatever its capitalisation or spacing", async () => {
    const slug = await aHousehold();
    await addMeal(slug, { name: "Butter chicken" });

    const { response, body } = await addMeal(slug, {
      name: "  Butter   Chicken ",
    });

    expect(response.status).toBe(409);
    expect(body.error).toBe("duplicate_meal");
    expect(String(body.message)).toMatch(/already/i);
    await expect(mealBank(slug)).resolves.toHaveLength(1);
  });

  it("lets two Households hold the same Meal", async () => {
    const [first, second] = [await aHousehold(), await aHousehold()];
    await addMeal(first, { name: "Butter chicken" });

    const { response } = await addMeal(second, { name: "Butter chicken" });

    expect(response.status).toBe(201);
  });

  it("answers an unknown Slug with the same 404 as reading one", async () => {
    const { response, body } = await addMeal("banana-apple-delicious-sauce", {
      name: "Butter chicken",
    });

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });
});

describe("editing a Meal", () => {
  it("renames it and describes it in place", async () => {
    const slug = await aHousehold();
    const { body: meal } = await addMeal(slug, { name: "Buter chicken" });

    const { response, body } = await editMeal(slug, String(meal.id), {
      name: "Butter chicken",
      description: "The one with the coconut milk",
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: meal.id,
      name: "Butter chicken",
      description: "The one with the coconut milk",
    });
    await expect(mealBank(slug)).resolves.toEqual([body]);
  });

  it("leaves the description alone when only the name changes", async () => {
    const slug = await aHousehold();
    const { body: meal } = await addMeal(slug, {
      name: "Lasagne",
      description: "Sunday one",
    });

    const { body } = await editMeal(slug, String(meal.id), { name: "Lasagna" });

    expect(body).toEqual({
      id: meal.id,
      name: "Lasagna",
      description: "Sunday one",
    });
  });

  it("clears the description when it is emptied", async () => {
    const slug = await aHousehold();
    const { body: meal } = await addMeal(slug, {
      name: "Lasagne",
      description: "Sunday one",
    });

    const { body } = await editMeal(slug, String(meal.id), {
      description: "",
    });

    expect(body.description).toBeNull();
  });

  it("refuses a rename onto a Meal already in the Bank", async () => {
    const slug = await aHousehold();
    await addMeal(slug, { name: "Butter chicken" });
    const { body: meal } = await addMeal(slug, { name: "Lasagne" });

    const { response, body } = await editMeal(slug, String(meal.id), {
      name: "butter chicken",
    });

    expect(response.status).toBe(409);
    expect(body.error).toBe("duplicate_meal");
  });

  it("lets a Meal keep its own name", async () => {
    const slug = await aHousehold();
    const { body: meal } = await addMeal(slug, { name: "Butter chicken" });

    const { response } = await editMeal(slug, String(meal.id), {
      name: "Butter Chicken",
      description: "Now described",
    });

    expect(response.status).toBe(200);
  });

  it("holds an edit to the same caps as an add", async () => {
    const slug = await aHousehold();
    const { body: meal } = await addMeal(slug, { name: "Lasagne" });

    const { response, body } = await editMeal(slug, String(meal.id), {
      name: "a".repeat(101),
    });

    expect(response.status).toBe(400);
    expect(String(body.message)).toMatch(/100 characters/);
  });

  it("answers a Meal from another Household with a 404", async () => {
    const [mine, theirs] = [await aHousehold(), await aHousehold()];
    const { body: meal } = await addMeal(theirs, { name: "Lasagne" });

    const { response, body } = await editMeal(mine, String(meal.id), {
      name: "Not mine",
    });

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });
});

describe("deleting a Meal", () => {
  it("takes it out of the Bank for good", async () => {
    const slug = await aHousehold();
    const { body: meal } = await addMeal(slug, { name: "Lasagne" });

    const response = await deleteMeal(slug, String(meal.id));

    expect(response.status).toBe(204);
    await expect(mealBank(slug)).resolves.toEqual([]);
  });

  it("frees the name for a fresh Meal", async () => {
    const slug = await aHousehold();
    const { body: meal } = await addMeal(slug, { name: "Lasagne" });
    await deleteMeal(slug, String(meal.id));

    const { response } = await addMeal(slug, { name: "Lasagne" });

    expect(response.status).toBe(201);
  });

  it("answers a Meal that is not there with a 404", async () => {
    const slug = await aHousehold();

    const response = await deleteMeal(slug, "not-a-meal-of-theirs");

    expect(response.status).toBe(404);
  });

  it("refuses to delete another Household's Meal", async () => {
    const [mine, theirs] = [await aHousehold(), await aHousehold()];
    const { body: meal } = await addMeal(theirs, { name: "Lasagne" });

    const response = await deleteMeal(mine, String(meal.id));

    expect(response.status).toBe(404);
    await expect(mealBank(theirs)).resolves.toHaveLength(1);
  });
});

describe("two people editing at once", () => {
  it("lets both of their Meals land", async () => {
    const slug = await aHousehold();

    const [her, him] = await Promise.all([
      addMeal(slug, { name: "Butter chicken" }),
      addMeal(slug, { name: "Lasagne" }),
    ]);

    expect(her.response.status).toBe(201);
    expect(him.response.status).toBe(201);
    expect((await mealBank(slug)).map((meal) => meal.name)).toEqual([
      "Butter chicken",
      "Lasagne",
    ]);
  });
});

describe("the caps on a Meal Bank", () => {
  it("takes a name of exactly 100 characters and refuses 101", async () => {
    const slug = await aHousehold();

    const atTheCap = await addMeal(slug, { name: "a".repeat(100) });
    const overIt = await addMeal(slug, { name: "b".repeat(101) });

    expect(atTheCap.response.status).toBe(201);
    expect(overIt.response.status).toBe(400);
    expect(overIt.body.error).toBe("invalid_meal");
    expect(String(overIt.body.message)).toMatch(/100 characters/);
  });

  it("takes a description of exactly 500 characters and refuses 501", async () => {
    const slug = await aHousehold();

    const atTheCap = await addMeal(slug, {
      name: "Stew",
      description: "a".repeat(500),
    });
    const overIt = await addMeal(slug, {
      name: "Soup",
      description: "a".repeat(501),
    });

    expect(atTheCap.response.status).toBe(201);
    expect(overIt.response.status).toBe(400);
    expect(String(overIt.body.message)).toMatch(/500 characters/);
  });

  it("refuses a Meal with no name at all", async () => {
    const slug = await aHousehold();

    const { response, body } = await addMeal(slug, { name: "   " });

    expect(response.status).toBe(400);
    expect(String(body.message)).toMatch(/needs a name/i);
  });

  it("takes the 500th Meal and refuses the 501st", async () => {
    const slug = await aHousehold();
    await Promise.all(
      Array.from({ length: 499 }, (_, n) =>
        addMeal(slug, { name: `Meal ${n + 1}` }),
      ),
    );

    const lastOne = await addMeal(slug, { name: "Meal 500" });
    const oneTooMany = await addMeal(slug, { name: "Meal 501" });

    expect(lastOne.response.status).toBe(201);
    expect(oneTooMany.response.status).toBe(409);
    expect(oneTooMany.body.error).toBe("meal_bank_full");
    await expect(mealBank(slug)).resolves.toHaveLength(500);
  }, 60_000);
});
