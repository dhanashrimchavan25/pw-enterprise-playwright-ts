import { test, expect } from "@apitest/fixtures/apiFixtures";
import { SiteApi } from "@apitest/page-helpers/SiteApi";

test.describe("Site health checks @regression", () => {
  test("Home page API responds with valid HTML content", async ({ request }) => {
    const api = new SiteApi(request);
    const { status, contentType } = await api.getHomePage();

    expect(status).toBe(200);
    expect(contentType).toContain("text/html");
  });

  test("Favicon API responds with a valid response", async ({ request }) => {
    const api = new SiteApi(request);
    const status = await api.getFavicon();
    expect(status).toBe(200);
  });
});
