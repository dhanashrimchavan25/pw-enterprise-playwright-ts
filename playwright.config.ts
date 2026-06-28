import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { appConfig } from "./src/helpers/ConfigManager";
import { buildReporters, getReportType } from "./src/helpers/reports/reportConfig";

export const isCI =
  process.env.GITHUB_ACTIONS === "true" || process.env.TF_BUILD === "True" || process.env.CI === "true";

const baseURL = appConfig.saucedemo.baseUrl;

export default defineConfig({
  timeout: 2 * 60 * 1000,
  expect: { timeout: 15_000 },

  fullyParallel: true,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,

  reporter: buildReporters(),
  outputDir: "./reports/test-artifacts",

  use: {
    baseURL,
    headless: false,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: isCI ? "retain-on-failure" : "on-first-retry",
    video: isCI ? "retain-on-failure" : "off",
  },

  projects: [
    {
      name: "api",
      testDir: "./src/apitest/testcase",
    },
    {
      name: "e2e",
      testDir: "./src/e2etest/testcase",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: path.join(__dirname, "src", "helpers", "globalSetup.ts"),
});

// Log active report mode once at config load (visible before tests run).
if (!process.env.__REPORT_TYPE_LOGGED) {
  process.env.__REPORT_TYPE_LOGGED = "true";
  console.log(`[reports] REPORT_TYPE=${getReportType()}`);
}
