import { expect, test } from "@playwright/test";
import { LOGIN_ROUTE, REGISTER_ROUTE, ROOT_ROUTE } from "@tests/utils/authentication";
import { navigateToPath } from "@tests/utils/navigation";

test.describe("Landing Page", () => {
   test("should display landing page with navigation", async({ page }) => {
      await navigateToPath(page, ROOT_ROUTE);

      // Verify the base project title and description are displayed correctly
      await expect(page.getByTestId("title")).toHaveText("Capital");
      await expect(page.getByTestId("description")).toHaveText("A data-driven finance tracker for the intelligent acquisition of capital");

      // Verify the login/register button navigation flows as expected
      await page.getByTestId("login").click();
      await expect(page).toHaveURL(LOGIN_ROUTE);
      await page.goBack();

      await page.getByTestId("register").click();
      await expect(page).toHaveURL(REGISTER_ROUTE);
   });
});