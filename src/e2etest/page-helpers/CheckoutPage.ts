import { expect } from "@playwright/test";
import { BasePage } from "@e2etest/common-helpers/BasePage";
import { Actions } from "@e2etest/common-helpers/Actions";
import { saucedemoLocators } from "@e2etest/locators/saucedemo.locators";

export type CheckoutInfo = {
  firstName: string;
  lastName: string;
  postalCode: string;
};

export class CheckoutPage extends BasePage {
  async fillShippingInfo(info: CheckoutInfo): Promise<void> {
    await Actions.type(this.page, saucedemoLocators.checkout.firstName, info.firstName);
    await Actions.type(this.page, saucedemoLocators.checkout.lastName, info.lastName);
    await Actions.type(this.page, saucedemoLocators.checkout.postalCode, info.postalCode);
  }

  async continueToOverview(): Promise<void> {
    await Actions.click(this.page, saucedemoLocators.checkout.continueButton);
    await expect(this.page).toHaveURL(/checkout-step-two\.html/);
  }

  async finishOrder(): Promise<void> {
    await Actions.click(this.page, saucedemoLocators.checkout.finishButton);
    await expect(this.page).toHaveURL(/checkout-complete\.html/);
  }

  async expectOrderComplete(): Promise<void> {
    await expect(this.page.locator(saucedemoLocators.checkout.completeHeader)).toHaveText(
      "Thank you for your order!",
    );
  }
}
