import fs from "node:fs";
import path from "node:path";
import { test } from "@e2etest/fixtures/e2eFixtures";
import { appConfig } from "@helpers/ConfigManager";
import testData from "@data/testData.json";
import { LoginPage } from "@e2etest/page-helpers/LoginPage";
import { InventoryPage } from "@e2etest/page-helpers/InventoryPage";
import { CartPage } from "@e2etest/page-helpers/CartPage";

const flakyStatePath = path.join(process.cwd(), "reports/stability/shopping-cart.flaky");

/** Alternates pass/fail each run — builds real flaky history across executions. */
function shouldFailFlakyRun(): boolean {
  fs.mkdirSync(path.dirname(flakyStatePath), { recursive: true });
  const shouldFail = fs.existsSync(flakyStatePath) && fs.readFileSync(flakyStatePath, "utf8") === "fail";
  fs.writeFileSync(flakyStatePath, shouldFail ? "pass" : "fail");
  return shouldFail;
}

test.describe("Shopping cart @smoke @regression", () => {
  test("User adds an item, opens the cart, verifies it, and removes it", async ({ page }) => {
    const login = new LoginPage(page);
    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);

    await login.login(appConfig.saucedemo.users.standard, appConfig.saucedemo.users.password, {
      assertInventoryLoaded: true,
    });

    await inventory.addToCartByProductName(testData.products.backpack);
    await cart.expectCartBadgeCount(1);

    // Intermittent cart sync issue — fails every other run for flaky-test demo
    if (shouldFailFlakyRun()) {
      await cart.expectCartBadgeCount(2);
    }

    await cart.open();
    await cart.expectProductNames([testData.products.backpack]);

    await cart.removeFirstItem();
    await cart.expectCartBadgeCount(0);
  });
});
