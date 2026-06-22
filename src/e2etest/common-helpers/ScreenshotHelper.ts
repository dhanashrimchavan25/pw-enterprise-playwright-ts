import type { Page, TestInfo } from "@playwright/test";
import { logger } from "@helpers/Logger";

export type ScreenshotOptions = {
  fullPage?: boolean;
  name?: string;
};

export class ScreenshotHelper {
  static async captureOnFailure(page: Page, testInfo: TestInfo): Promise<void> {
    if (testInfo.status === testInfo.expectedStatus) return;

    try {
      const buf = await page.screenshot({ fullPage: true });
      await testInfo.attach("failure-screenshot", { body: buf, contentType: "image/png" });
    } catch (error) {
      logger.warn(`Failed to capture screenshot: ${(error as Error).message}`);
    }
  }

  static async capture(
    page: Page,
    testInfo: TestInfo,
    options?: ScreenshotOptions,
  ): Promise<void> {
    const buf = await page.screenshot({ fullPage: options?.fullPage ?? true });
    await testInfo.attach(options?.name ?? "screenshot", {
      body: buf,
      contentType: "image/png",
    });
  }
}
