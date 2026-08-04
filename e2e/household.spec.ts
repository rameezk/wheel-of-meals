import { expect, test } from "@playwright/test";

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
  await expect(page.getByText("Cooking Days")).toBeVisible();
  await expect(page.getByText("Sunday")).toBeVisible();
  await expect(page.getByText("No meals yet.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Cooking Days")).toBeVisible();
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
