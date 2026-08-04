import { defineConfig, devices } from "@playwright/test";

const deployedUrl = process.env.BASE_URL;
const localPort = 8788;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: deployedUrl ?? `http://localhost:${localPort}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedUrl
    ? undefined
    : {
        command: `npm run build && npm run db:migrate:local && npx wrangler dev --port ${localPort}`,
        url: `http://localhost:${localPort}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
