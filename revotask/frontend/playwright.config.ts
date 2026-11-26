import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite. Point it at production with:
 *   PLAYWRIGHT_BASE_URL=https://<app>.vercel.app E2E_API_BASE_URL=https://<api-project>.vercel.app/api npx playwright test
 * Set PLAYWRIGHT_HTML_REPORT=e2e-report/production to write the report to a committed folder.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: /screenshots\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2, // small suite; keeps memory use and load on a live deployment low
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
