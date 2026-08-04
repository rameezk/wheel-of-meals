import { expect, test, type Page } from "@playwright/test";

const toggleDay = (page: Page, day: string) =>
  page.getByText(day, { exact: true }).click();

const createHousehold = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a Household" }).click();
  const href = await page
    .getByRole("link", { name: "Open my Household" })
    .getAttribute("href");
  expect(href).toMatch(/^\/[a-z]+(-[a-z]+){3}$/);
  return String(href);
};

const openHousehold = async (page: Page) => {
  const href = await createHousehold(page);
  await page.getByRole("link", { name: "Open my Household" }).click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  return href;
};

test("creating a Household hands over a Slug that opens it again", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Wheel of Meals" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Create a Household" }).click();

  await expect(page.getByRole("alert")).toContainText("cannot be recovered");

  const openIt = page.getByRole("link", { name: "Open my Household" });
  const href = await openIt.getAttribute("href");
  expect(href).toMatch(/^\/[a-z]+(-[a-z]+){3}$/);

  await openIt.click();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { name: "Meal Bank" })).toBeVisible();
  await expect(page.getByText("Sunday", { exact: true })).toBeVisible();
  await expect(page.getByText("No Meals yet.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Meal Bank" })).toBeVisible();
});

test("a Household names itself and picks the nights it cooks", async ({
  page,
}) => {
  const href = await openHousehold(page);

  await expect(
    page.getByRole("heading", { name: href.slice(1) }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page).toHaveURL(new RegExp(`${href}/settings$`));
  await page.getByLabel("Household name (optional)").fill("The Khans");
  await toggleDay(page, "Sunday");
  await toggleDay(page, "Friday");
  await expect(
    page.getByRole("checkbox", { name: "Sunday" }),
  ).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Friday" })).toBeChecked();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "The Khans" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${href}$`));

  await page.reload();
  await expect(page.getByRole("heading", { name: "The Khans" })).toBeVisible();
  await expect(page.getByText(href.slice(1))).toBeVisible();
  await expect(page.getByText("Friday", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Sunday" }),
  ).toContainText("not cooking");
});

test("the settings close on the browser's own Back button", async ({
  page,
}) => {
  const href = await openHousehold(page);

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Household name (optional)")).toBeVisible();

  await page.goBack();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { name: "Meal Bank" })).toBeVisible();
});

test("the settings open straight from their own link", async ({ page }) => {
  const href = await createHousehold(page);

  await page.goto(`${href}/settings`);

  await expect(page.getByLabel("Household name (optional)")).toBeVisible();
});

test("a Household cannot stop cooking altogether", async ({ page }) => {
  await openHousehold(page);

  await page.getByRole("button", { name: "Settings" }).click();
  for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
    await toggleDay(page, day);

  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("at least one day");
});

test("the landing page offers the last Household opened, and waits to be asked", async ({
  page,
}) => {
  const href = await openHousehold(page);
  await expect(page.getByRole("heading", { name: "Meal Bank" })).toBeVisible();

  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Create a Household" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: `Open ${href.slice(1)}` }).click();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { name: "Meal Bank" })).toBeVisible();
});

test("four words typed in open the Household on a device that has never seen it", async ({
  page,
}) => {
  const href = await createHousehold(page);

  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page
    .getByLabel("Your four words")
    .fill(`  ${href.slice(1).replaceAll("-", " ").toUpperCase()}  `);
  await page.getByRole("button", { name: "Open", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { name: "Meal Bank" })).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("button", { name: `Open ${href.slice(1)}` }),
  ).toBeVisible();
});

test("a remembered Household that opens nothing stops being offered", async ({
  page,
}) => {
  const slug = "banana-apple-delicious-sauce";
  await page.goto("/");
  await page.evaluate(
    (remembered) =>
      localStorage.setItem("wheel-of-meals.household", remembered),
    JSON.stringify({ slug, name: null }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: `Open ${slug}` }).click();

  await expect(page.getByRole("alert")).toContainText("opens nothing");

  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Open .+/ })).toHaveCount(0);
});

test("four words nobody was given say so, rather than looking broken", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Your four words").fill("banana apple delicious sauce");
  await page.getByRole("button", { name: "Open", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("not found");
  await expect(page).toHaveURL(/\/$/);
});

test("a Slug nobody was given opens nothing", async ({ page }) => {
  await page.goto("/banana-apple-delicious-sauce");

  await expect(page.getByRole("alert")).toContainText("opens nothing");
});

test("crawlers are locked out", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Disallow: /");
});
