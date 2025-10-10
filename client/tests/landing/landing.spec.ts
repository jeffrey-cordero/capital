import { expect, test } from "@playwright/test";
import { LOGIN_ROUTE, REGISTER_ROUTE } from "@tests/utils/authentication";
import { navigateToPath } from "@tests/utils/navigation";

test.describe("Landing Page", () => {
   test("should display landing page with navigation", async({ page }) => {
      await navigateToPath(page, "/");

      // Verify base project title and description
      await expect(page.getByTestId("title")).toHaveText("Capital");
      await expect(page.getByTestId("description")).toHaveText("A data-driven finance tracker for the intelligent acquisition of capital");

      // Verify login/register button navigation
      await page.getByTestId("login").click();
      await expect(page).toHaveURL(LOGIN_ROUTE);
      await page.goBack();

      // Check for register button and navigate
      await page.getByTestId("register").click();
      await expect(page).toHaveURL(REGISTER_ROUTE);
   });
});