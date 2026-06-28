import { test, expect } from "@fixtures/sharedFixtures";
import { ScreenshotHelper } from "@e2etest/common-helpers/ScreenshotHelper";

export { test, expect };

test.afterEach(async ({ page }, testInfo) => {
  await ScreenshotHelper.captureOnFailure(page, testInfo);
});
