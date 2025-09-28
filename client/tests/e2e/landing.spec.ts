/**
 * E2E tests for the landing page
 */

import { test, expect } from '@playwright/test';
import { TEST_CONSTANTS, SELECTORS } from "../utils/landing";
import { waitForPageLoad } from "../utils/utils";

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
   await page.goto(TEST_CONSTANTS.LANDING_PAGE);
   await waitForPageLoad(page);
  });

  test('should display the Capital logo', async ({ page }) => {
    // TODO: data-testid
   const logo = page.locator(SELECTORS.LOGO);
   await expect(logo).toBeVisible();
   await expect(logo).toHaveAttribute('src', '/svg/logo.svg');
  });

  test('should display the main title', async ({ page }) => {
   const title = page.locator(SELECTORS.TITLE);
   await expect(title).toBeVisible();
   await expect(title).toHaveText('Capital');
  });

  test('should display the subtitle', async ({ page }) => {
    const subtitle = page.locator(SELECTORS.SUBTITLE);
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('A data-driven finance tracker for the intelligent acquisition of capital');
  });

  test('should display login and register buttons', async ({ page }) => {
    const loginButton = page.locator(SELECTORS.LOGIN_BUTTON);
    const registerButton = page.locator(SELECTORS.REGISTER_BUTTON);

    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText('Log In');
    await expect(loginButton).toHaveAttribute('id', 'login');

    await expect(registerButton).toBeVisible();
    await expect(registerButton).toHaveText('Register');
    await expect(registerButton).toHaveAttribute('id', 'register');
  });

  test('should navigate to login page when login button is clicked', async ({ page }) => {
   const loginButton = page.locator(SELECTORS.LOGIN_BUTTON);
   await loginButton.click();

   await expect(page).toHaveURL(TEST_CONSTANTS.LOGIN_PAGE);
  });

  test('should navigate to register page when register button is clicked', async ({ page }) => {
   const registerButton = page.locator(SELECTORS.REGISTER_BUTTON);
   await registerButton.click();

   await expect(page).toHaveURL(TEST_CONSTANTS.REGISTER_PAGE);
  });

  test('should have proper page title and meta information', async ({ page }) => {
    await expect(page).toHaveTitle('Capital');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
   await page.setViewportSize({ width: 375, height: 667 });

   const title = page.locator(SELECTORS.TITLE);
   const subtitle = page.locator(SELECTORS.SUBTITLE);
   const loginButton = page.locator(SELECTORS.LOGIN_BUTTON);
   const registerButton = page.locator(SELECTORS.REGISTER_BUTTON);

   await expect(title).toBeVisible();
   await expect(subtitle).toBeVisible();
   await expect(loginButton).toBeVisible();
   await expect(registerButton).toBeVisible();
  });
});
