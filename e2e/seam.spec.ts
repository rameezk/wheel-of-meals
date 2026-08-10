import { expect, test } from "@playwright/test";

const cookingDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

const tapped = ["Lasagne", "Butter chicken", "Tacos", "Fried rice"];

const typedIn = "Bunny chow";

const drawnFrom = new RegExp([...tapped, typedIn].join("|"));

test("a new Household is created, guided, spun, and comes back filled", async ({
  page,
  request,
}) => {
  await page.goto("/");

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
});
