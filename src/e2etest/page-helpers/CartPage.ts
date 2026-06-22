import { expect } from "@playwright/test";
import { BasePage } from "@e2etest/common-helpers/BasePage";
import { Actions } from "@e2etest/common-helpers/Actions";
import { saucedemoLocators } from "@e2etest/locators/saucedemo.locators";

export class CartPage extends BasePage {
  async open(): Promise<void> {
    await Actions.click(this.page, saucedemoLocators.inventory.cartLink);
    await expect(this.page).toHaveURL(/cart\.html/);
    await expect(this.page.locator(saucedemoLocators.cart.container)).toBeVisible();
  }

  async expectCartBadgeCount(count: number): Promise<void> {
    const badge = this.page.locator(saucedemoLocators.inventory.cartBadge);
    if (count === 0) {
      await expect(badge).toHaveCount(0);
      return;
    }
    await expect(badge).toHaveText(String(count));
  }

  async expectProductNames(names: string[]): Promise<void> {
    const titles = this.page
      .locator(saucedemoLocators.cart.cartItem)
      .locator(saucedemoLocators.inventory.productName);
    await expect(titles).toHaveCount(names.length);
    for (let i = 0; i < names.length; i++) {
      await expect(titles.nth(i)).toHaveText(names[i]!);
    }
  }

  async removeFirstItem(): Promise<void> {
    await this.page
      .locator(saucedemoLocators.cart.cartItem)
      .first()
      .getByRole("button", { name: /^Remove$/i })
      .click();
  }

  async proceedToCheckout(): Promise<void> {
    await Actions.click(this.page, saucedemoLocators.cart.checkoutButton);
    await expect(this.page).toHaveURL(/checkout-step-one\.html/);
  }
}
