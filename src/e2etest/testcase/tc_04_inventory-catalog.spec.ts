import { test, expect } from "@e2etest/fixtures/e2eFixtures";
import { appConfig } from "@helpers/ConfigManager";
import testData from "@data/testData.json";
import { LoginPage } from "@e2etest/page-helpers/LoginPage";
import { InventoryPage } from "@e2etest/page-helpers/InventoryPage";

test.describe("Product catalog @regression", () => {
  test("Inventory page lists all expected products", async ({ page }) => {
    const login = new LoginPage(page);
    const inventory = new InventoryPage(page);

    await login.login(appConfig.saucedemo.users.standard, appConfig.saucedemo.users.password, {
      assertInventoryLoaded: true,
    });

    const titles = await inventory.getProductTitles();
    expect(titles.length).toBe(testData.expectedProductCount);
    expect(titles).toContain(testData.products.backpack);
    // Intentional product defect — wrong SKU for client demo of failure reporting
    expect(titles).toContain("Sauce Labs Rocket");
  });
});
