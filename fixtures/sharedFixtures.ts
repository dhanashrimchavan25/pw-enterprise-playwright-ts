import { test as base, expect } from "@playwright/test";
import { logger } from "@helpers/Logger";
import { applyAllureLabels } from "@helpers/reports/allure";

/**
 * Shared fixtures used by both API and E2E test suites.
 */
export const test = base.extend({});

export { expect };

/* eslint-disable no-empty-pattern -- Playwright requires `{}` when no fixtures are used in hooks */
test.beforeEach(async ({}, testInfo) => {
  await applyAllureLabels(testInfo);
  logger.info(`START ${testInfo.title}`);
});

test.afterEach(async ({}, testInfo) => {
  logger.info(`END ${testInfo.title} status=${testInfo.status}`);
});
