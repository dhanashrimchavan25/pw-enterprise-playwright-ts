import { expect } from "@playwright/test";
import { BasePage } from "@e2etest/common-helpers/BasePage";
import { Actions } from "@e2etest/common-helpers/Actions";
import { saucedemoLocators } from "@e2etest/locators/saucedemo.locators";
import { InventoryPage } from "@e2etest/page-helpers/InventoryPage";

export class LoginPage extends BasePage {
  async login(
    username: string,
    password: string,
    options?: { assertInventoryLoaded?: boolean },
  ): Promise<void> {
    await this.goto("/");
    await Actions.type(this.page, saucedemoLocators.login.username, username);
    await Actions.type(this.page, saucedemoLocators.login.password, password);
    await Actions.click(this.page, saucedemoLocators.login.loginButton);

    if (options?.assertInventoryLoaded) {
      const inventory = new InventoryPage(this.page);
      await inventory.expectLoaded();
    }
  }

  async expectErrorContains(text: string): Promise<void> {
    await expect(this.page.locator(saucedemoLocators.login.error)).toContainText(text);
  }
}
