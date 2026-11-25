import { defineConfig, devices } from "@playwright/test";

// Used only to capture README screenshots (the regular config ignores screenshots.spec.ts).
export default defineConfig({
  testDir: "./e2e",
  testMatch: /screenshots\.spec\.ts/,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000", ...devices["Desktop Chrome"] },
});
