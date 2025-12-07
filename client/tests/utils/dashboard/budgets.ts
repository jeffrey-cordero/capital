import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { assertComponentIsVisible, assertInputVisibility, closeModal } from "@tests/utils";
import { BUDGETS_ROUTE, DASHBOARD_ROUTE } from "@tests/utils/authentication";
import { assertValidationErrors, submitForm } from "@tests/utils/forms";
import { navigateToPath } from "@tests/utils/navigation";
import { type BudgetCategory, type BudgetType } from "capital/budgets";
import { HTTP_STATUS } from "capital/server";

import { displayCurrency } from "@/lib/display";

/**
 * Budget category state for verification
 */
export type BudgetCategoryState = {
   name: string;
   goal: number;
   budget_category_id: string;
};

/**
 * Budget state with goal and categories for page verification and assertions
 */
export type BudgetState = {
   goal: number;
   categories: BudgetCategoryState[];
};

/**
 * Complete budget page state with Income and Expenses for assertions
 */
export type BudgetPageState = {
   Income: BudgetState;
   Expenses: BudgetState;
};

/**
 * Budget trend data for Income and Expenses across 12 months
 */
export type BudgetTrendData = {
   Income: number[];
   Expenses: number[];
};

/**
 * Budget progress data with [used, allocated] tuples for main and subcategories
 */
export type BudgetProgressData = {
   Income: {
      main: Array<[number, number]>;
      sub: Array<[number, number]>;
   };
   Expenses: {
      main: Array<[number, number]>;
      sub: Array<[number, number]>;
   };
};

/**
 * Budget category form data with goal amount
 */
export type BudgetCategoryFormData = Partial<BudgetCategory> & { goal: number };

/**
 * Budget navigation test configuration with goal arrays for each month
 */
export type BudgetNavigationTestConfig = {
   /* Array indices: 0 = current month, 1 = one month back, 2 = two months back, etc. */
   updatingMonths: number[];
   Income: {
      /* Array of goals for each month for main category */
      goals: number[];
      /* Object with category IDs as keys and arrays of goals for each month for subcategories */
      categories: {
         [categoryId: string]: number[];
      };
   };
   Expenses: {
      goals: number[];
      categories: {
         [categoryId: string]: number[];
      };
   };
};

/**
 * Gets all budget category IDs from the page for a specific type
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetType} type - Budget type (`"Income"` or `"Expenses"`)
 * @returns {Promise<string[]>} Array of budget category IDs
 */
export async function getBudgetCategoryIds(page: Page, type: BudgetType): Promise<string[]> {
   const editButtons: Locator = page.locator(`[data-testid^="budget-category-edit-"][data-testid$="-${type}"]`);

   return (await editButtons.evaluateAll(els =>
      els.map(el => el.getAttribute("data-testid"))
   )).filter((id): id is string =>
      id !== null && /^budget-category-edit-[\da-f-]{36}-(Income|Expenses)$/i.test(id)
   ).map(id => id.replace("budget-category-edit-", "").replace(`-${type}`, ""));
}

/**
 * Gets the main budget category IDs for Income and Expenses
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<{mainIncomeCategoryId: string, mainExpenseCategoryId: string}>} Object with main category IDs
 */
export async function getMainBudgetCategoryIds(page: Page): Promise<{
   mainIncomeCategoryId: string;
   mainExpenseCategoryId: string;
}> {
   const mainIncomeCategoryId: string | null = await page.getByTestId("budget-category-Income").getAttribute("data-category-id");
   const mainExpenseCategoryId: string | null = await page.getByTestId("budget-category-Expenses").getAttribute("data-category-id");

   if (!mainIncomeCategoryId || !mainExpenseCategoryId) {
      throw new Error("Main budget category IDs not found on page");
   }

   return { mainIncomeCategoryId, mainExpenseCategoryId };
}

/**
 * Opens budget form modal for the specified type
 *
 * @param {Page} page - Playwright page
 * @param {BudgetType} type - Budget type
 */
export async function openBudgetForm(page: Page, type: BudgetType): Promise<void> {
   const targetModal: Locator = page.getByTestId(`budget-form-${type}`);
   if (await targetModal.isVisible()) return;

   const oppositeType: BudgetType = type === "Income" ? "Expenses" : "Income";
   const oppositeModal: Locator = page.getByTestId(`budget-form-${oppositeType}`);

   if (await oppositeModal.isVisible()) {
      if (await page.getByTestId("transaction-budget-category-select").isVisible()) {
         // Close any visible transaction form
         await closeModal(page);
      }

      await closeModal(page, false, `budget-form-${oppositeType}`);
   }

   await page.getByTestId(`budget-category-edit-${type}`).click();
   await expect(targetModal).toBeVisible();
}

/**
 * Navigates budget period forward or backward by the specified months
 *
 * @param {Page} page - Playwright page
 * @param {number} months - Months to navigate (positive = forward, negative = backward)
 */
export async function navigateBudgetPeriod(page: Page, months: number): Promise<void> {
   // Ensure any open modals are closed for navigation to work as expected
   const incomeModal: Locator = page.getByTestId("budget-form-Income");
   const expensesModal: Locator = page.getByTestId("budget-form-Expenses");

   if (await incomeModal.isVisible()) {
      await closeModal(page, false, "budget-form-Income");
   } else if (await expensesModal.isVisible()) {
      await closeModal(page, false, "budget-form-Expenses");
   }

   const count: number = Math.abs(months);
   const direction: string = months > 0 ? "next" : "previous";

   for (let i = 0; i < count; i++) {
      await page.getByTestId(`budget-period-${direction}`).click();
      await expect(page.getByTestId("budget-period-label")).toBeVisible();
   }
}

/**
 * Creates a budget category with optional validation error handling
 *
 * @param {Page} page - Playwright page
 * @param {BudgetCategoryFormData} categoryData - Category form data
 * @param {BudgetType} [type="Income"] - Budget type
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 * @returns {Promise<string>} Category ID or empty string if validation errors occur
 */
export async function createBudgetCategory(
   page: Page,
   categoryData: BudgetCategoryFormData,
   type: BudgetType = "Income",
   expectedErrors?: Record<string, string>
): Promise<string> {
   await openBudgetForm(page, type);
   await page.getByRole("button", { name: "Add Category" }).click();

   await assertInputVisibility(page, "budget-category-name-input", "Name");
   await assertInputVisibility(page, "budget-category-goal-input", "Goal");

   const formData: Record<string, any> = {};

   for (const [key, value] of Object.entries(categoryData)) {
      if (value !== undefined) formData[`budget-category-${key}-input`] = value;
   }

   let responsePromise: Promise<Response> | null = null;

   if (!expectedErrors) {
      responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes("/api/v1/dashboard/budgets/category")
            && response.request().method() === "POST";
      });
   }

   await submitForm(page, formData, {
      buttonType: "Create",
      containsErrors: expectedErrors ? true : false
   });

   if (expectedErrors) {
      await assertValidationErrors(page, expectedErrors);
      return "";
   }

   const response = await responsePromise as Response;
   expect(response.status()).toBe(HTTP_STATUS.CREATED);

   const responseBody = await response.json();
   const categoryId: string = responseBody.data?.budget_category_id;
   await assertComponentIsVisible(page, `budget-category-item-${categoryId}`);

   return categoryId;
}

/**
 * Updates a budget category or main budget goal via the form, where an
 * empty category ID implies updating the main budget goal instead
 *
 * @param {Page} page - Playwright page
 * @param {string} categoryId - Category ID or empty string for the main budget goal
 * @param {BudgetCategoryFormData} categoryData - Category form data
 * @param {BudgetType} [type="Income"] - Budget type
 * @param {Record<string, string>} [expectedErrors] - Expected validation errors
 */
export async function updateBudgetCategory(
   page: Page,
   categoryId: string,
   categoryData: BudgetCategoryFormData,
   type: BudgetType = "Income",
   expectedErrors?: Record<string, string>
): Promise<void> {
   await openBudgetForm(page, type);

   let requestMethod: string | undefined;
   let responsePromise: Promise<Response> | null = null;
   let submitButtonSelector: string | undefined;

   const formData: Record<string, any> = {};
   const isMainBudget: boolean = !categoryId;

   if (isMainBudget) {
      submitButtonSelector = "[data-testid='budget-goal-submit']";
      if (categoryData.goal !== undefined) {
         formData["budget-goal-input"] = categoryData.goal;
      }
   } else {
      // Ensure we are in editing mode for the sub category
      await page.getByTestId(`budget-category-edit-btn-${categoryId}`).click();
      submitButtonSelector = `[data-testid="budget-category-${categoryId}-submit"]`;

      for (const [key, value] of Object.entries(categoryData)) {
         if (value !== undefined) {
            formData[`budget-category-${key}-edit-${categoryId}`] = value;
         }
      }
   }

   if (!expectedErrors) {
      responsePromise = page.waitForResponse((response: Response) => {
         requestMethod = response.request().method();
         return response.url().includes("/api/v1/dashboard/budgets")
            && (requestMethod === "PUT" || requestMethod === "POST");
      });
   }

   await submitForm(page, formData, {
      buttonType: "Update",
      submitButtonSelector,
      containsErrors: expectedErrors ? true : false
   });

   if (expectedErrors) {
      await assertValidationErrors(page, expectedErrors);
      return;
   }

   const response: Response = await responsePromise as Response;
   const status: number = response.status();

   if (requestMethod === "POST") {
      // POST should imply a new goal entry was created
      expect(status).toBe(HTTP_STATUS.CREATED);
   } else {
      // PUT should imply an existing goal entry was meant to be updated
      expect(status).toBe(HTTP_STATUS.NO_CONTENT);
   }
}

/**
 * Tests cancel behavior for budget category operations without persisting changes
 *
 * @param {Page} page - Playwright page
 * @param {BudgetPageState} state - Expected budget page state
 * @param {("create_category" | "update_main_category" | "update_sub_category")} operation - Operation type
 */
export async function performAndAssertCancelBudgetCategory(
   page: Page,
   state: BudgetPageState,
   operation: "create_category" | "update_main_category" | "update_sub_category"
): Promise<void> {
   await openBudgetForm(page, "Income");

   let inputTestId: string;
   let cancelButtonTestId: string;
   const budgetState: BudgetPageState = Object.assign({}, state);

   if (operation === "create_category") {
      await page.getByRole("button", { name: "Add Category" }).click();
      inputTestId = "budget-category-goal-input";
      cancelButtonTestId = "budget-category-new-cancel";
   } else if (operation === "update_main_category") {
      inputTestId = "budget-goal-input";
      cancelButtonTestId = "budget-goal-cancel";
   } else {
      const categoryData: BudgetCategoryFormData = { name: "Original", goal: 1000 };
      const categoryId: string = await createBudgetCategory(page, categoryData, "Income");
      inputTestId = `budget-category-goal-edit-${categoryId}`;
      cancelButtonTestId = `budget-category-${categoryId}-cancel`;

      // Open the category editor to update the goal
      await page.getByTestId(`budget-category-edit-btn-${categoryId}`).click();

      // Ensure the category is added to the overall budget state
      budgetState.Income.categories.push({ ...categoryData, budget_category_id: categoryId } as BudgetCategoryState);
   }

   // Fill in a random goal value and cancel the operation
   await page.getByTestId(inputTestId).fill("0.00");
   await page.getByTestId(cancelButtonTestId).click();

   // Ensure the original budget state is restored
   await assertBudgetPageState(page, budgetState);
}

/**
 * Deletes a budget category with optional confirmation or cancellation
 *
 * @param {Page} page - Playwright page
 * @param {string} categoryId - Category ID to delete
 * @param {BudgetType} type - Budget type
 * @param {boolean} [confirmDelete=true] - Whether to confirm deletion
 */
export async function deleteBudgetCategory(
   page: Page,
   categoryId: string,
   type: BudgetType,
   confirmDelete: boolean = true
): Promise<void> {
   await openBudgetForm(page, type);

   // Ensure the budget category container is within the viewport and visible
   const category: Locator = page.getByTestId(`budget-category-item-${categoryId}`);
   await category.scrollIntoViewIfNeeded();
   await category.hover();

   // Ensure the confirmation dialog is visible after clicking the delete icon
   await page.getByTestId(`budget-category-delete-${categoryId}`).click();

   const cancelButton: Locator = page.getByTestId(`budget-category-delete-${categoryId}-cancel`);
   const confirmButton: Locator = page.getByTestId(`budget-category-delete-${categoryId}-confirm`);
   await expect(cancelButton).toBeVisible();
   await expect(confirmButton).toBeVisible();

   if (confirmDelete) {
      const responsePromise: Promise<Response> = page.waitForResponse((response: Response) => {
         return response.url().includes(`/api/v1/dashboard/budgets/category/${categoryId}`)
            && response.request().method() === "DELETE";
      });

      await confirmButton.click();

      const response: Response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);
      await expect(category).toBeHidden();
      await page.waitForTimeout(5000);
   } else {
      await cancelButton.click();

      await expect(confirmButton).toBeHidden();
      await expect(category).toBeVisible();
   }
}

/**
 * Asserts budget category container displays correct name and goal
 *
 * @param {Page} page - Playwright page
 * @param {string} categoryId - Category ID
 * @param {string} name - Expected category name
 * @param {number} goal - Expected goal amount
 */
async function assertBudgetCategoryContainer(
   page: Page,
   categoryId: string,
   name: string,
   goal: number
): Promise<void> {
   const nameLocator: Locator = page.getByTestId(`budget-category-name-${categoryId}`);
   const goalLocator: Locator = page.getByTestId(`budget-category-goal-${categoryId}`);
   const progressLocator: Locator = page.getByTestId(`budget-category-progress-${categoryId}`);

   await expect(nameLocator).toHaveText(name);
   await expect(goalLocator).toHaveText(`${displayCurrency(0)} / ${displayCurrency(goal)}`);
   await expect(progressLocator).toHaveAttribute("data-progress-percent", "0");
}

/**
 * Asserts budget form modal contains expected goal and category values
 *
 * @param {Page} page - Playwright page
 * @param {BudgetType} type - Budget type
 * @param {BudgetState} expectedContent - Expected form content
 */
export async function assertBudgetFormContent(
   page: Page,
   type: BudgetType,
   expectedContent: BudgetState
): Promise<void> {
   await openBudgetForm(page, type);

   await assertInputVisibility(page, "budget-goal-input", "Goal", String(expectedContent.goal));

   if (expectedContent.categories.length > 0) {
      for (const category of expectedContent.categories) {
         const categoryId: string = category.budget_category_id;
         const container: Locator = page.getByTestId(`budget-category-view-${categoryId}`);

         // Ensure the container displays the correct name and goal
         await expect(container.locator(".MuiListItemText-primary").first()).toHaveText(category.name);
         await expect(container.locator(".MuiListItemText-secondary").first()).toHaveText(displayCurrency(category.goal));

         // Ensure the category editor is visible and contains the correct name and goal input fields
         await page.getByTestId(`budget-category-edit-btn-${categoryId}`).click();
         await assertInputVisibility(page, `budget-category-name-edit-${categoryId}`, "Name", category.name);
         await assertInputVisibility(page, `budget-category-goal-edit-${categoryId}`, "Goal", String(category.goal));
      }
   } else {
      // Ensure the category list is hidden if there are no categories
      await expect(page.getByTestId(`budget-category-list-${type}`)).toBeHidden();
   }
}

/**
 * Asserts budget page matches expected state for both Income and Expenses sections
 *
 * @param {Page} page - Playwright page
 * @param {BudgetPageState} state - Expected budget page state
 */
export async function assertBudgetPageState(
   page: Page,
   state: BudgetPageState
): Promise<void> {
   for (const type of ["Income", "Expenses"] as BudgetType[]) {
      // For main categories, the name is the same as the type
      const mainCategoryName: string = type;
      await assertBudgetCategoryContainer(page, type, mainCategoryName, state[type].goal);

      for (const category of state[type].categories) {
         await assertBudgetCategoryContainer(page, category.budget_category_id, category.name, category.goal);
      }

      await assertBudgetFormContent(page, type, { goal: state[type].goal, categories: state[type].categories });
      await closeModal(page, false, `budget-form-${type}`);
   }
}

/**
 * Asserts budget categories are displayed in the expected order
 *
 * @param {Page} page - Playwright page
 * @param {string[]} expectedOrder - Expected category ID order
 */
export async function assertBudgetCategoryOrder(page: Page, expectedOrder: string[]): Promise<void> {
   const items: Locator = page.locator("[data-testid^='budget-category-item-']");
   const count: number = await items.count();
   expect(count).toBe(expectedOrder.length);

   for (let i = 0; i < expectedOrder.length; i++) {
      const item: Locator = items.nth(i);
      const testId: string | null = await item.getAttribute("data-testid");
      expect(testId).toBe(`budget-category-item-${expectedOrder[i]}`);
   }
}

/**
 * Asserts budget categories in transaction dropdown with proper grouping
 *
 * @param {Page} page - Playwright page
 * @param {BudgetType} type - Budget type
 * @param {BudgetCategoryState[]} [expectedIncomeCategories] - Expected income categories
 * @param {BudgetCategoryState[]} [expectedExpenseCategories] - Expected expense categories
 * @param {string} [autoSelectedCategoryId] - Category ID to verify auto-selected
 */
export async function assertTransactionBudgetCategoryDropdown(
   page: Page,
   type: BudgetType,
   expectedIncomeCategories: BudgetCategoryState[] = [],
   expectedExpenseCategories: BudgetCategoryState[] = [],
   autoSelectedCategoryId?: string
): Promise<void> {
   await openBudgetForm(page, type);

   // Open the transaction form
   const addButton: Locator = page.getByRole("button", { name: /add transaction/i });
   await addButton.scrollIntoViewIfNeeded();
   await addButton.click();

   // Open the category select dropdown
   const inputElement: Locator = page.getByTestId("transaction-budget-category-select");
   const selectElement: Locator = page.locator("label:has-text(\"Category\")").locator("..").locator(".MuiSelect-root");
   await selectElement.click({ force: true });

   // Collect all option texts in DOM order
   const listbox: Locator = page.locator("ul[role=\"listbox\"]");
   const optionLocators: Locator = listbox.locator("li[role=\"option\"]");

   const actualOrder: string[] = [];
   const count: number = await optionLocators.count();

   for (let i = 0; i < count; i++) {
      const text: string = await optionLocators.nth(i).innerText();
      actualOrder.push(text.trim());
   }

   // Build expected list in the exact displayed order
   const expectedOrder: string[] = [
      "Income",
      ...expectedIncomeCategories.map(c => c.name),
      "Expenses",
      ...expectedExpenseCategories.map(c => c.name)
   ];

   // Assert the category options match exactly
   expect(actualOrder).toEqual(expectedOrder);

   if (autoSelectedCategoryId) {
      // Category option values should be represented by their ID
      await expect(inputElement).toHaveValue(autoSelectedCategoryId);
      await expect(selectElement).toContainText(type);
   }

   // Close the select dropdown
   await page.keyboard.press("Escape");

   // Close the transaction form
   await page.keyboard.press("Escape");
}

/**
 * Sets up budget goal persistence by updating goals across specified months
 *
 * @param {Page} page - Playwright page
 * @param {BudgetNavigationTestConfig} config - Configuration with goal arrays and months to update
 */
export async function setupBudgetGoalPersistence(
   page: Page,
   config: BudgetNavigationTestConfig
): Promise<void> {
   const { updatingMonths } = config;
   let monthIndex: number = 0, updateIndex: number = 0;

   while (updateIndex < updatingMonths.length) {
      if (monthIndex === updatingMonths[updateIndex]) {
         const index: number = updatingMonths[updateIndex];

         for (const type of ["Income", "Expenses"] as const) {
            // Update the main budget goal
            await updateBudgetCategory(page, "", { goal: config[type].goals[index] }, type);

            // Update the sub categories goals
            for (const [category, goals] of Object.entries(config[type].categories)) {
               await updateBudgetCategory(page, category, { goal: goals[index] }, type);
            }
         }

         updateIndex++;
      }

      monthIndex++;
      await navigateBudgetPeriod(page, -1);
   }

   await navigateBudgetPeriod(page, 1 + updatingMonths[updateIndex - 1]);
}

/**
 * Asserts budget goals persist correctly across months by navigating and validating goal values
 *
 * @param {Page} page - Playwright page
 * @param {BudgetNavigationTestConfig} config - Configuration with expected goal arrays
 * @param {("forward" | "backward")} [direction="backward"] - Navigation direction
 */
export async function assertBudgetGoalPersistence(
   page: Page,
   config: BudgetNavigationTestConfig,
   direction: "forward" | "backward" = "backward"
): Promise<void> {
   // All goals are sorted in descending month order
   const goals: number = config.Income.goals.length;
   const start: number = direction === "backward" ? 0 : goals - 1;
   const end: number = direction === "backward" ? goals : -1;
   const increment: number = direction === "backward" ? 1 : -1;

   for (let i = start; i !== end; i += increment) {
      await assertBudgetPageState(page, {
         Income: {
            goal: config.Income.goals[i],
            categories: Object.entries(config.Income.categories).map(([categoryId, goals]) => ({
               goal: goals[i],
               name: "Income Test",
               budget_category_id: categoryId
            }))
         },
         Expenses: {
            goal: config.Expenses.goals[i],
            categories: Object.entries(config.Expenses.categories).map(([categoryId, goals]) => ({
               goal: goals[i],
               name: "Expense Test",
               budget_category_id: categoryId
            }))
         }
      });

      if (i + increment !== end) {
         // Going forward in array implies moving backward in time, but the navigation helper requires a negative increment
         await navigateBudgetPeriod(page, -increment);
      }
   }
}

/**
 * Asserts budget pie chart displays with correct visibility
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetType} type - Budget type (`"Income"` or `"Expenses"`)
 * @param {number} expectedUsed - Expected used amount
 */
export async function assertBudgetPieChart(
   page: Page,
   type: BudgetType,
   expectedUsed: number
): Promise<void> {
   const pieChart: Locator = page.getByTestId(`budget-pie-chart-${type}`);
   await expect(pieChart).toBeVisible();

   const centerLabel: Locator = page.getByTestId(`budget-pie-center-${type}`);
   await expect(centerLabel).toBeVisible();

   const expectedText: string = `$${expectedUsed.toLocaleString()}`;
   await expect(centerLabel).toHaveText(expectedText);
}

/**
 * Asserts budget category progress bar displays correct percentage and goal text
 *
 * @param {Page} page - Playwright page instance
 * @param {string} categoryId - Budget category ID or type (`"Income"` or `"Expenses"`) for main categories only
 * @param {number} expectedUsed - Expected used amount
 * @param {number} expectedAllocated - Expected allocated goal
 */
export async function assertBudgetProgress(
   page: Page,
   categoryId: string,
   expectedUsed: number,
   expectedAllocated: number
): Promise<void> {
   const progress: Locator = page.getByTestId(`budget-category-progress-${categoryId}`);
   await expect(progress).toBeVisible();

   const expectedPercent: number = expectedAllocated > 0 ? (expectedUsed / expectedAllocated) * 100 : 0;
   const actualPercent: string | null = await progress.getAttribute("data-progress-percent");
   expect(parseFloat(actualPercent!)).toBeCloseTo(expectedPercent, 2);

   const goalElement: Locator = page.getByTestId(`budget-category-goal-${categoryId}`);
   const expectedGoalText: string = `${displayCurrency(expectedUsed)} / ${displayCurrency(expectedAllocated)}`;
   await expect(goalElement).toHaveText(expectedGoalText);
}

/**
 * Asserts single budget period progress for all single budget categories tied to each type
 *
 * @param {Page} page - Playwright page instance
 * @param {string} incomeCategoryId - Income budget category ID
 * @param {string} expenseCategoryId - Expense budget category ID
 * @param {BudgetProgressData} progress - Budget progress data with [used, allocated] tuples
 * @param {number} month - Month index (0-11)
 */
export async function assertBudgetPeriodProgress(
   page: Page,
   incomeCategoryId: string,
   expenseCategoryId: string,
   progress: BudgetProgressData,
   month: number
): Promise<void> {
   const [incomeUsed, incomeGoal] = progress.Income.main[month];
   const [incomeSubUsed, incomeSubGoal] = progress.Income.sub[month];
   const [expenseUsed, expenseGoal] = progress.Expenses.main[month];
   const [expenseSubUsed, expenseSubGoal] = progress.Expenses.sub[month];

   await assertBudgetPieChart(page, "Income", incomeUsed);
   await assertBudgetProgress(page, "Income", incomeUsed, incomeGoal);
   await assertBudgetProgress(page, incomeCategoryId, incomeSubUsed, incomeSubGoal);

   await assertBudgetPieChart(page, "Expenses", expenseUsed);
   await assertBudgetProgress(page, "Expenses", expenseUsed, expenseGoal);
   await assertBudgetProgress(page, expenseCategoryId, expenseSubUsed, expenseSubGoal);
}

/**
 * Asserts budget trends bar chart displays correct used values across months for a single year
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetType} type - Budget type (`"Income"` or `"Expenses"`)
 * @param {number[]} monthlyTrends - Array of used amounts for 12 months
 */
async function assertBudgetTrendsForYear(
   page: Page,
   type: BudgetType,
   monthlyTrends: number[]
): Promise<void> {
   const currentMonth: number = new Date().getMonth() + 1;
   expect(monthlyTrends.length).toBe(12);

   // Check each month's bar chart value
   for (let i = 0; i < 12; i++) {
      const used: number = monthlyTrends[i];
      const bar: Locator = page.getByTestId(`budgets-${type}-bar-${i}`);

      // Get the bar value from the data attribute for simplicity
      const barValue: string | null = await bar.getAttribute("data-bar-chart-value");

      if (i >= currentMonth) {
         // Future months should be null
         expect(barValue).toBe("null");
      } else {
         // Current months should show the used value
         expect(barValue).toBe(used.toString());
      }
   }
}

/**
 * Asserts budget trends persist correctly across years by navigating and validating trend values
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetTrendData} currentYearTrends - Current year trend data for Income and Expenses
 * @param {BudgetTrendData} lastYearTrends - Last year trend data for Income and Expenses
 * @param {number} currentYear - Current year
 * @param {number} lastYear - Previous year
 * @param {("forward" | "backward")} direction - Navigation direction
 */
export async function assertBudgetTrends(
   page: Page,
   currentYearTrends: BudgetTrendData,
   lastYearTrends: BudgetTrendData,
   currentYear: number,
   lastYear: number,
   direction: "forward" | "backward"
): Promise<void> {
   const years: number = 2;
   const start: number = direction === "backward" ? 0 : years - 1;
   const end: number = direction === "backward" ? years : -1;
   const increment: number = direction === "backward" ? 1 : -1;

   for (let i = start; i !== end; i += increment) {
      const isCurrentYear: boolean = i === 0;
      const trends: BudgetTrendData = isCurrentYear ? currentYearTrends : lastYearTrends;
      const year: number = isCurrentYear ? currentYear : lastYear;

      const routes = isCurrentYear ? [DASHBOARD_ROUTE, BUDGETS_ROUTE] : [BUDGETS_ROUTE];

      for (const route of routes) {
         // For the current year, we will also ensure consistency across the dashboard and budgets pages
         await navigateToPath(page, route);
         await assertBudgetTrendsForYear(page, "Income", trends.Income);
         await assertBudgetTrendsForYear(page, "Expenses", trends.Expenses);
         await expect(page.getByTestId("budgets-trends-container")).toHaveAttribute("data-year", year.toString());
      }

      if (i + increment !== end) {
         const navigationDirection: string = direction === "backward" ? "back" : "forward";
         await page.getByTestId(`budgets-navigate-${navigationDirection}`).click();
         await expect(page.getByTestId("budgets-trends-container")).toBeVisible();
      }
   }
}

/**
 * Asserts budget goals persist correctly across months by navigating and validating goal values
 *
 * @param {Page} page - Playwright page instance
 * @param {string} incomeCategoryId - Income budget category ID
 * @param {string} expenseCategoryId - Expense budget category ID
 * @param {BudgetProgressData} currentYearProgress - Current year progress data
 * @param {BudgetProgressData} lastYearProgress - Last year progress data
 * @param {number} currentMonth - Current month (0-11)
 * @param {("forward" | "backward")} direction - Navigation direction
 */
export async function assertBudgetProgressPersistence(
   page: Page,
   incomeCategoryId: string,
   expenseCategoryId: string,
   currentYearProgress: BudgetProgressData,
   lastYearProgress: BudgetProgressData,
   currentMonth: number,
   direction: "forward" | "backward"
): Promise<void> {
   const totalMonths: number = 12;
   const start: number = direction === "backward" ? 0 : totalMonths - 1;
   const end: number = direction === "backward" ? totalMonths : -1;
   const increment: number = direction === "backward" ? 1 : -1;

   for (let i = start; i !== end; i += increment) {
      const monthsBack: number = i;
      const isCurrentYear: boolean = monthsBack <= currentMonth;
      const progress: BudgetProgressData = isCurrentYear ? currentYearProgress : lastYearProgress;
      const month: number = isCurrentYear ? currentMonth - monthsBack : 12 + currentMonth - monthsBack;

      await assertBudgetPeriodProgress(page, incomeCategoryId, expenseCategoryId, progress, month);

      if (i + increment !== end) {
         const navigationDirection: string = direction === "backward" ? "previous" : "next";
         await page.getByTestId(`budget-period-${navigationDirection}`).click();
         await expect(page.getByTestId("budget-period-label")).toBeVisible();
      }
   }
}