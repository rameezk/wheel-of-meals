import { expect, test, type Page } from "@playwright/test";

const toggleDay = (page: Page, day: string) =>
  page.getByText(day, { exact: true }).click();

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
  await expect(
    page.getByRole("heading", { name: "Cooking Days" }),
  ).toBeVisible();
  await expect(page.getByText("Sunday", { exact: true })).toBeVisible();
  await expect(page.getByText("No Meals yet.")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cooking Days" }),
  ).toBeVisible();
});

test("a Household names itself and picks the nights it cooks", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a Household" }).click();

  const openIt = page.getByRole("link", { name: "Open my Household" });
  const href = String(await openIt.getAttribute("href"));
  await openIt.click();

  await expect(
    page.getByRole("heading", { name: href.slice(1) }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Household name (optional)").fill("The Khans");
  await toggleDay(page, "Sunday");
  await toggleDay(page, "Friday");
  await expect(
    page.getByRole("checkbox", { name: "Sunday" }),
  ).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Friday" })).toBeChecked();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "The Khans" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "The Khans" })).toBeVisible();
  await expect(page.getByText(href.slice(1))).toBeVisible();
  await expect(page.getByText("Friday", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Sunday" }),
  ).toContainText("not cooking");
});

test("a Household cannot stop cooking altogether", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a Household" }).click();
  await page.getByRole("link", { name: "Open my Household" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"])
    await toggleDay(page, day);

  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("at least one day");
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
