/**
 * Wait for page to be fully loaded
 */
export const waitForPageLoad = async (page: any) => {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('body');
};

/**
 * Take a screenshot for debugging
 */
export const takeScreenshot = async (page: any, name: string) => {
  await page.screenshot({
    path: `tests/screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
};

/**
 * Wait for element to be visible and clickable
 */
export const waitForClickable = async (page: any, selector: string) => {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.waitForSelector(selector, { state: 'attached' });
};
