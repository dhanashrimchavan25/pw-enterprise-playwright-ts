import { BaseApiClient } from "@apitest/common-helpers/BaseApiClient";
import { saucedemoEndpoints } from "@apitest/locators/saucedemo.endpoints";

/**
 * API page-helper module for Sauce Demo origin HTTP checks.
 * Replace with AuthApi, UserApi, ProductApi on real client apps.
 */
export class SiteApi extends BaseApiClient {
  async getHomePage(): Promise<{ status: number; contentType: string }> {
    const response = await this.get(saucedemoEndpoints.home);
    return {
      status: response.status(),
      contentType: response.headers()["content-type"] ?? "",
    };
  }

  async getFavicon(): Promise<number> {
    const response = await this.get(saucedemoEndpoints.favicon);
    return response.status();
  }
}
