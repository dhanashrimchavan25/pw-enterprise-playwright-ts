import type { Page } from "@playwright/test";
import { Actions } from "@e2etest/common-helpers/Actions";

/**
 * Base class for all E2E page-helper modules.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async goto(path: string): Promise<void> {
    await Actions.goto(this.page, path);
  }

  protected async waitForNetworkIdle(timeoutMs?: number): Promise<void> {
    await Actions.waitForNetworkIdle(this.page, timeoutMs);
  }
}
