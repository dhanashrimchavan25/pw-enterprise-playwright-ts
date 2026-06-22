import { test, expect } from "@e2etest/fixtures/e2eFixtures";
import { appConfig } from "@helpers/ConfigManager";
import testData from "@data/testData.json";
import { LoginPage } from "@e2etest/page-helpers/LoginPage";
import { InventoryPage } from "@e2etest/page-helpers/InventoryPage";

test.describe("Inventory sort @regression", () => {
  test("Sorting low to high price shows the cheapest product first", async ({ page }) => {
    const login = new LoginPage(page);
    const inventory = new InventoryPage(page);

    await login.login(appConfig.saucedemo.users.standard, appConfig.saucedemo.users.password, {
      assertInventoryLoaded: true,
    });

    await inventory.sortBy("lohi");
    await expect(await inventory.firstProductTitle()).toBe(testData.sortExpectations.lohi.firstProduct);
  });
});
