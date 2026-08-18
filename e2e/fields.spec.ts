import { expect, test, type Page } from "@playwright/test";

const zoomFreeSize = 16;

const textEntry = [
  "input:not([type])",
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input[type="number"]',
  "textarea",
].join(", ");

const fieldsAreTooBigToZoom = async (page: Page, screen: string) => {
  const fields = page.locator(textEntry);

  await expect(fields.first(), `${screen} shows no text field`).toBeVisible();

  const measured = await fields.evaluateAll((found) =>
    found.map((field) => ({
      named:
        field.getAttribute("aria-label") ||
        field.getAttribute("placeholder") ||
        field.id ||
        field.tagName,
      size: Number.parseFloat(getComputedStyle(field).fontSize),
    })),
  );

  for (const { named, size } of measured)
    expect(size, `${screen}: ${named}`).toBeGreaterThanOrEqual(zoomFreeSize);
};

test("every text field computes above the size that makes mobile Safari zoom", async ({
  page,
}) => {
  await page.goto("/");
  await fieldsAreTooBigToZoom(page, "the landing page");

  await page.getByRole("button", { name: "Create a Household" }).click();
  await page.getByRole("link", { name: "Open my Household" }).click();

  await expect(
    page.getByRole("heading", { name: "What do you cook often?" }),
  ).toBeVisible();
  await fieldsAreTooBigToZoom(page, "the first-run guide");

  await page.getByRole("button", { name: "Skip for now" }).click();

  await page.getByRole("button", { name: /^Open the Meal Bank/ }).click();
  await expect(page.getByLabel("Filter")).toBeVisible();
  await fieldsAreTooBigToZoom(page, "the Meal Bank");

  await page.getByLabel("Meal", { exact: true }).fill("Lasagne");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Lasagne", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await fieldsAreTooBigToZoom(page, "the Recipe sheet");

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Back to the Household" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Household name (optional)")).toBeVisible();
  await fieldsAreTooBigToZoom(page, "Settings");
});
