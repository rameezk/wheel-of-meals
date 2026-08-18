import { expect, test } from "@playwright/test";

const cookingDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

const tapped = ["Lasagne", "Butter chicken", "Tacos", "Fried rice"];

const typedIn = "Bunny chow";

const drawnFrom = new RegExp([...tapped, typedIn].join("|"));

test("a new Household is created, guided, spun, and comes back filled", async ({
  page,
  request,
}) => {
  const landing = await page.goto("/");

  expect((await landing?.allHeaders())?.["referrer-policy"]).toBe(
    "same-origin",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );

  await page.getByRole("button", { name: "Create a Household" }).click();

  const openIt = page.getByRole("link", { name: "Open my Household" });
  const href = String(await openIt.getAttribute("href"));
  expect(href).toMatch(/^\/[a-z]+(-[a-z]+){3}$/);

  await openIt.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));

  await expect(
    page.getByRole("heading", { name: "What do you cook often?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Household name")).toHaveCount(0);
  await expect(
    page.getByRole("list", { name: "In the Meal Bank" }),
  ).toHaveCount(0);

  for (const name of tapped)
    await page.getByRole("button", { name: `Add ${name}` }).click();

  await page.getByLabel("Or add your own").fill(typedIn);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expect(
    page.getByRole("list", { name: "In the Meal Bank" }).getByRole("listitem"),
  ).toHaveText([...tapped, typedIn]);

  await page.getByRole("button", { name: "Spin the Week" }).click();

  for (const day of cookingDays)
    await expect(
      page.getByRole("listitem").filter({ hasText: day }),
    ).toContainText(drawnFrom);

  await page.reload();

  await expect(
    page.getByRole("button", {
      name: /^Open the Meal Bank\s*5 Meals to draw from/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What do you cook often?" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /^Open the Meal Bank/ }).click();

  const openTheRecipe = page.getByRole("button", {
    name: "Tacos",
    exact: true,
  });
  await openTheRecipe.click();

  const sheet = page.getByRole("dialog", { name: "Tacos" });
  await expect(sheet).toBeVisible();

  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${href}/meal-bank$`));

  await openTheRecipe.click();
  await sheet.getByRole("button", { name: "Edit" }).click();
  await sheet.getByLabel(/^Source/).fill("recipes.example.com/tacos?page=2");
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(
    sheet.getByRole("link", {
      name: "https://recipes.example.com/tacos?page=2",
    }),
  ).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();

  const marked = page.getByRole("button", { name: /^Tacos.*has a Recipe/ });
  await expect(marked).toBeVisible();

  await page.reload();
  await expect(marked).toBeVisible();
  await marked.click();

  const followIt = page.getByRole("link", {
    name: "https://recipes.example.com/tacos?page=2",
  });
  await expect(followIt).toHaveAttribute("target", "_blank");
  await expect(followIt).toHaveAttribute("rel", "noopener noreferrer");

  const ingredients = "12 tortillas\n2 limes\nA white cabbage";
  const method = "Fry the fish hot and fast.\n\nWarm the tortillas last.";
  await sheet.getByRole("button", { name: "Edit" }).click();
  await sheet.getByLabel(/^Ingredients/).fill(ingredients);
  await sheet.getByLabel(/^Method/).fill(method);
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(sheet.getByText("12 tortillas")).toBeVisible();
  await expect(sheet.getByText("Fry the fish hot and fast.")).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();

  await page.reload();
  await marked.click();
  await expect(sheet.getByText("A white cabbage")).toBeVisible();
  await expect(sheet.getByText("Warm the tortillas last.")).toBeVisible();

  await sheet.getByRole("button", { name: "Edit" }).click();
  await expect(sheet.getByLabel(/^Ingredients/)).toHaveValue(ingredients);
  await expect(sheet.getByLabel(/^Method/)).toHaveValue(method);

  await sheet.getByLabel(/^Source/).fill("");
  await sheet.getByLabel(/^Ingredients/).fill("");
  await sheet.getByLabel(/^Method/).fill("");
  await sheet.getByRole("button", { name: "Save" }).click();

  await sheet.getByRole("button", { name: /^Keep the Recipe/ }).click();
  await expect(sheet).toBeVisible();

  await sheet.getByRole("button", { name: "Save" }).click();
  await sheet.getByRole("button", { name: /^Yes, remove the Recipe/ }).click();

  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(openTheRecipe).toBeVisible();
  await expect(marked).toHaveCount(0);
});
