import { expect, test } from "@playwright/test";

test("one deploy serves both the SPA and the API", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Wheel of Meals" }),
  ).toBeVisible();
  await expect(page.getByText("API is awake")).toBeVisible();
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
