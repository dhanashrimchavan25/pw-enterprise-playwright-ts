import { test, expect } from "@e2etest/fixtures/e2eFixtures";
import { appConfig } from "@helpers/ConfigManager";
import { LoginPage } from "@e2etest/page-helpers/LoginPage";

test.describe("Login @smoke", () => {
  test("Standard user logs in and lands on the inventory page", async ({ page }) => {
    const login = new LoginPage(page);

    await login.login(appConfig.saucedemo.users.standard, appConfig.saucedemo.users.password, {
      assertInventoryLoaded: true,
    });

    await expect(page).toHaveURL(/inventory\.html/);
  });

  test("Locked out user sees an error and stays on the login page", async ({ page }) => {
    const login = new LoginPage(page);

    await login.login(appConfig.saucedemo.users.lockedOut, appConfig.saucedemo.users.password);
    await login.expectErrorContains("locked out");
  });
});
