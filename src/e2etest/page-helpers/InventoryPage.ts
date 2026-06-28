import { expect } from "@playwright/test";
import { BasePage } from "@e2etest/common-helpers/BasePage";
import type { SortOption } from "@models/Product";
import { saucedemoLocators } from "@e2etest/locators/saucedemo.locators";

export class InventoryPage extends BasePage {
  async expectLoaded(): Promise<void> {
    await expect(this.page.locator(saucedemoLocators.inventory.title)).toHaveText("Products");
    await expect(this.page.locator(saucedemoLocators.inventory.inventoryItem).first()).toBeVisible();
  }

  async getProductTitles(): Promise<string[]> {
    return this.page.locator(saucedemoLocators.inventory.productName).allInnerTexts();
  }

  async addToCartByProductName(productName: string): Promise<void> {
    const item = this.page.locator(saucedemoLocators.inventory.item).filter({ hasText: productName });
    await item.getByRole("button", { name: /^Add to cart$/i }).click();
  }

  async sortBy(value: SortOption): Promise<void> {
    const sort = this.page
      .locator(saucedemoLocators.inventory.productSort)
      .or(this.page.locator('[data-test="product_sort_container"]'));
    await sort.waitFor({ state: "visible" });
    await sort.selectOption(value);
  }

  async firstProductTitle(): Promise<string> {
    return (await this.page.locator(saucedemoLocators.inventory.productName).first().innerText()).trim();
  }
}
