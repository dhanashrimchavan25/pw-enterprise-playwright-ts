import type { Locator, Page } from "@playwright/test";
import { logger } from "@helpers/Logger";

export type ClickTarget = Locator | string;

function asLocator(page: Page, target: ClickTarget): Locator {
  return typeof target === "string" ? page.locator(target) : target;
}

export class Actions {
  static async goto(page: Page, url: string): Promise<void> {
    logger.info(`Goto: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }

  static async click(page: Page, target: ClickTarget, options?: { timeout?: number }): Promise<void> {
    const loc = asLocator(page, target);
    await loc.waitFor({ state: "visible", timeout: options?.timeout });
    await loc.click();
  }

  static async type(page: Page, target: ClickTarget, text: string): Promise<void> {
    const loc = asLocator(page, target);
    await loc.waitFor({ state: "visible" });
    await loc.fill(text);
  }

  static async getText(page: Page, target: ClickTarget): Promise<string> {
    const loc = asLocator(page, target);
    await loc.waitFor({ state: "visible" });
    return (await loc.innerText()).trim();
  }

  static async waitForNetworkIdle(page: Page, timeoutMs: number = 10_000): Promise<void> {
    try {
      await page.waitForLoadState("networkidle", { timeout: timeoutMs });
    } catch {
      // Non-fatal in real apps (polling/websockets) — continue.
    }
  }
}
