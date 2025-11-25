import { expect, type Page, type Response } from "@playwright/test";
import { assertComponentIsVisible, assertInputVisibility, closeModal } from "@tests/utils";
import { assertValidationErrors, submitForm, updateSelectValue } from "@tests/utils/forms";
import { type BudgetCategory } from "capital/budgets";
import { HTTP_STATUS } from "capital/server";

import { displayCurrency } from "@/lib/display";

/**
 * Budget category state for verification
 */
export type BudgetCategoryState = {
   budget_category_id: string;
   name: string;
   goal: number;
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
 * Single category assertion state for page verification after navigation
 */
export type SingleCategoryAssertion = {
   budget_category_id: string;
   name: string;
   goal: number;
   categories: BudgetCategoryState[];
};

/**
 * Budget category form data for submission with optional goal override
 */
export type BudgetCategoryFormData = Partial<BudgetCategory> & { goal: number };

/**
 * Budget navigation test configuration with hierarchical goal arrays for main and subcategories
 * Array indices correspond to month positions: 0 = current, 1 = one month back, 2 = two months back, etc.
 * updatingMonths specifies which indices should be explicitly updated (others inherit/persist from earlier updates)
 */
export type BudgetNavigationTestConfig = {
   updatingMonths: number[];
   Income: {
      goals: number[];
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
 * Opens budget form modal for the specified type
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} type - Budget type to open
 */
export async function openBudgetForm(page: Page, type: "Income" | "Expenses"): Promise<void> {
   const targetModal = page.getByTestId(`budget-form-${type}`);
   if (await targetModal.isVisible()) {
      return;
   }

   const oppositeType = type === "Income" ? "Expenses" : "Income";
   const oppositeModal = page.getByTestId(`budget-form-${oppositeType}`);
   if (await oppositeModal.isVisible()) {
      await closeModal(page, false, `budget-form-${oppositeType}`);
   }

   const editButton = page.getByTestId(`budget-category-edit-${type}`);
   await expect(editButton).toBeVisible();
   await expect(editButton).toBeEnabled();
   await editButton.click();

   await assertComponentIsVisible(page, `budget-form-${type}`);
}

/**
 * Navigates budget period forward or backward
 *
 * @param {Page} page - Playwright page instance
 * @param {number} months - Number of months to navigate (positive = forward, negative = backward)
 */
export async function navigateBudgetPeriod(page: Page, months: number): Promise<void> {
   // Close any open modals before navigating using Escape key
   const incomeModal = page.getByTestId("budget-form-Income");
   const expensesModal = page.getByTestId("budget-form-Expenses");

   if (await incomeModal.isVisible()) {
      await closeModal(page, false, "budget-form-Income");
   } else if (await expensesModal.isVisible()) {
      await closeModal(page, false, "budget-form-Expenses");
   }

   const direction = months > 0 ? "next" : "previous";
   const count = Math.abs(months);

   for (let i = 0; i < count; i++) {
      const button = page.getByTestId(`budget-period-${direction}`);
      await button.click();

      // Wait for the period display to update by checking it's visible
      await expect(page.getByTestId("budget-period-label")).toBeVisible();
   }
}

/**
 * Creates a budget category
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetCategoryFormData} categoryData - Category data
 * @param {string} type - Budget type to create category (defaults to `"Income"`)
 * @param {Record<string, string>} [expectedErrors] - Optional validation errors
 * @returns {Promise<string>} Created category ID or empty string for expected validation errors
 */
export async function createBudgetCategory(
   page: Page,
   categoryData: BudgetCategoryFormData,
   type: "Income" | "Expenses" = "Income",
   expectedErrors?: Record<string, string>
): Promise<string> {
   await openBudgetForm(page, type);

   // Wait for the category creation form to be visible
   const addButton = page.getByRole("button", { name: "Add Category" });
   await addButton.click();

   await assertInputVisibility(page, "budget-category-name-input", "Name");
   await assertInputVisibility(page, "budget-category-goal-input", "Goal");

   const formData: Record<string, any> = {};

   if (categoryData.name !== undefined) formData["budget-category-name-input"] = categoryData.name;
   if (categoryData.goal !== undefined) formData["budget-category-goal-input"] = categoryData.goal;

   let responsePromise: Promise<Response> | null = null;

   if (!expectedErrors) {
      responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes("/api/v1/dashboard/budgets/category")
            && response.request().method() === "POST";
      });
   }

   await submitForm(page, formData, { buttonType: "Create", containsErrors: expectedErrors ? true : false });

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
 * Cancels budget category creation or edit operation and closes the form without saving changes
 *
 * @param {Page} page - Playwright page instance
 * @param {"create" | "edit"} operation - Type of operation being cancelled
 * @param {string} [categoryId] - Category ID, required for edit operations
 */
export async function cancelBudgetCategoryOperation(
   page: Page,
   operation: "create" | "edit",
   categoryId?: string
): Promise<void> {
   if (operation === "edit" && !categoryId) {
      throw new Error("categoryId is required for edit operation cancellation");
   }

   // Determine the data testid for the operation
   const testId = operation === "create" ? "budget-category-new" : `budget-category-${categoryId}`;

   // Click the Cancel button using the formatted testid
   const cancelButton = page.getByTestId(`${testId}-cancel`);
   await cancelButton.click();
}

/**
 * Updates a budget category or main budget goal via the form
 * If categoryId is empty/falsy, updates the main budget goal instead
 *
 * @param {Page} page - Playwright page instance
 * @param {string} categoryId - Category ID to update, or empty string to update main budget goal
 * @param {BudgetCategoryFormData} categoryData - Updated category data
 * @param {string} [type] - Optional budget type to auto-open modal
 * @param {Record<string, string>} [expectedErrors] - Optional validation errors
 */
export async function updateBudgetCategory(
   page: Page,
   categoryId: string,
   categoryData: BudgetCategoryFormData,
   type?: "Income" | "Expenses",
   expectedErrors?: Record<string, string>
): Promise<void> {
   // Ensure correct modal is open if type is provided
   if (type) {
      await openBudgetForm(page, type);
   }

   const isMainBudget = !categoryId;

   if (isMainBudget) {
      // MAIN BUDGET GOAL UPDATE PATH
      const formData: Record<string, any> = {};
      if (categoryData.goal !== undefined) formData["budget-goal-input"] = categoryData.goal;

      // Wait for main budget goal update request (if no errors expected)
      let responsePromise;
      let requestMethod: string | undefined;
      if (!expectedErrors) {
         responsePromise = page.waitForResponse((response: Response) => {
            const isMatch = response.url().includes("/api/v1/dashboard/budgets")
               && (response.request().method() === "PUT" || response.request().method() === "POST");
            requestMethod = response.request().method();
            return isMatch;
         });
      }

      // Submit main budget form (submitForm will find the Update button automatically)
      await submitForm(page, formData, { buttonType: "Update", containsErrors: expectedErrors ? true : false });

      if (expectedErrors) {
         await assertValidationErrors(page, expectedErrors);
         return;
      }

      const response = await responsePromise;
      expect(response).not.toBeNull();

      // Main budget goal can return 201 (create) or 204 (update)
      const status = response!.status();
      if (requestMethod === "POST") {
         expect(status).toBe(HTTP_STATUS.CREATED);
      } else {
         expect(status).toBe(HTTP_STATUS.NO_CONTENT);
      }
   } else {
      // SUB-CATEGORY UPDATE PATH
      // Click edit button for the category
      await page.getByTestId(`budget-category-edit-btn-${categoryId}`).click();

      const formData: Record<string, any> = {};
      if (categoryData.name !== undefined) formData[`budget-category-name-edit-${categoryId}`] = categoryData.name;
      if (categoryData.goal !== undefined) formData[`budget-category-goal-edit-${categoryId}`] = categoryData.goal;
      if (categoryData.type !== undefined) formData[`budget-category-type-edit-${categoryId}`] = categoryData.type;

      // Wait for category and/or budget goal update requests (if no errors expected)
      let responsePromise;
      let requestMethod: string | undefined;
      if (!expectedErrors) {
         responsePromise = page.waitForResponse((response: Response) => {
            const isMatch = response.url().includes("/api/v1/dashboard/budgets")
               && (response.request().method() === "PUT" || response.request().method() === "POST");
            requestMethod = response.request().method();
            return isMatch;
         });
      }

      // Use submitForm helper with custom field handling for type dropdown
      const submitButtonSelector = `[data-testid="budget-category-${categoryId}-submit"]`;

      // Handle type separately as it's a dropdown - must update before submitForm
      const typeTestId = `budget-category-type-edit-${categoryId}`;
      if (formData[typeTestId]) {
         const typeValue = formData[typeTestId];
         delete formData[typeTestId];

         // Update type first before calling submitForm
         await updateSelectValue(page, typeTestId, String(typeValue));
      }

      // Now submit form with other fields
      await submitForm(page, formData, { buttonType: "Update", submitButtonSelector, containsErrors: expectedErrors ? true : false });

      if (expectedErrors) {
         await assertValidationErrors(page, expectedErrors);
         return;
      }

      const response = await responsePromise;
      expect(response).not.toBeNull();

      // Verify correct status code: 201 for POST (create), 204 for PUT (update)
      const status = response!.status();
      if (requestMethod === "POST") {
         expect(status).toBe(HTTP_STATUS.CREATED);
      } else {
         expect(status).toBe(HTTP_STATUS.NO_CONTENT);
      }
   }
}

/**
 * Deletes a budget category
 *
 * @param {Page} page - Playwright page instance
 * @param {string} categoryId - Category ID to delete
 * @param {string} type - Budget type to ensure correct modal is open
 * @param {boolean} [confirmDelete=true] - Whether to confirm deletion
 */
export async function deleteBudgetCategory(
   page: Page,
   categoryId: string,
   type: "Income" | "Expenses",
   confirmDelete: boolean = true
): Promise<void> {
   await openBudgetForm(page, type);

   const item = page.getByTestId(`budget-category-item-${categoryId}`);

   // Scroll into view and hover to make delete button visible
   await item.scrollIntoViewIfNeeded();
   await item.hover();

   // Click the delete icon (FontAwesomeIcon with delete test ID)
   const deleteIcon = page.getByTestId(`budget-category-delete-${categoryId}`);
   await expect(deleteIcon).toBeVisible();
   await deleteIcon.click();

   // Wait for the confirmation dialog to appear
   const confirmButton = page.getByTestId(`budget-category-delete-${categoryId}-confirm`);
   await expect(confirmButton).toBeVisible();

   if (confirmDelete) {
      // Set up response listener before clicking confirm
      const responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes(`/api/v1/dashboard/budgets/category/${categoryId}`) && response.request().method() === "DELETE";
      });

      await confirmButton.click();

      // Wait for API response
      const response = await responsePromise;
      expect(response.status()).toBe(HTTP_STATUS.NO_CONTENT);

      // Assert category is removed from DOM
      await expect(item).toBeHidden();
   } else {
      // Click cancel button
      const cancelButton = page.getByTestId(`budget-category-delete-${categoryId}-cancel`);
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();

      // Assert dialog closed and item still visible
      await expect(confirmButton).toBeHidden();
      await expect(item).toBeVisible();
   }
}

/**
 * Asserts the budget category container displays correct information with optional subcategories validation
 *
 * @param {Page} page - Playwright page instance
 * @param {string} categoryId - Budget category ID
 * @param {string} name - Expected category name
 * @param {number} goal - Expected goal amount
 */
async function assertBudgetCategoryContainer(
   page: Page,
   categoryId: string,
   name: string,
   goal: number
): Promise<void> {
   const container = page.getByTestId(`budget-category-${categoryId}`);
   await assertComponentIsVisible(page, `budget-category-${categoryId}`);
   await expect(container).toContainText(name);
   await expect(container).toContainText(displayCurrency(goal));
}

/**
 * Asserts budget page matches expected state for both Income and Expenses sections
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetPageState} state - Expected budget page state with categories and goals
 */
export async function assertBudgetPageState(
   page: Page,
   state: BudgetPageState
): Promise<void> {
   for (const type of ["Income", "Expenses"] as const) {
      // Assert the containers for the current type
      const mainCategoryName: string = type;
      await assertBudgetCategoryContainer(page, type, mainCategoryName, state[type].goal);

      for (const category of state[type].categories) {
         await assertBudgetCategoryContainer(page, category.budget_category_id, category.name, category.goal);
      }

      // Assert that the form content within the modal is consistent with the container content
      await assertBudgetFormContent(page, type, { goal: state[type].goal, categories: state[type].categories });

      // Close the modal for further assertions
      await closeModal(page, false, `budget-form-${type}`);
   }
}

/**
 * Asserts budget categories are displayed in the expected order
 *
 * @param {Page} page - Playwright page instance
 * @param {string[]} expectedOrder - Expected order of category IDs
 */
export async function assertBudgetCategoryOrder(page: Page, expectedOrder: string[]): Promise<void> {
   const items = page.locator("[data-testid^='budget-category-item-']");
   const count = await items.count();

   expect(count).toBe(expectedOrder.length);

   for (let i = 0; i < expectedOrder.length; i++) {
      const item = items.nth(i);
      const testId = await item.getAttribute("data-testid");
      expect(testId).toBe(`budget-category-item-${expectedOrder[i]}`);
   }
}

/**
 * Asserts budget form modal contains expected values
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} type - Budget type
 * @param {BudgetState} [expectedContent] - Expected form content with goal and categories
 */
export async function assertBudgetFormContent(
   page: Page,
   type: "Income" | "Expenses",
   expectedContent: BudgetState
): Promise<void> {
   await openBudgetForm(page, type);

   // Assert main goal if provided
   await assertInputVisibility(
      page,
      "budget-goal-input",
      "Goal",
      String(expectedContent.goal)
   );

   // Assert sub-categories if provided
   if (expectedContent.categories.length > 0) {
      for (const category of expectedContent.categories) {
         // Edit the category
         await (page.getByTestId(`budget-category-edit-btn-${category.budget_category_id}`)).click();

         // Verify category name
         await assertInputVisibility(
            page,
            `budget-category-name-edit-${category.budget_category_id}`,
            "Name",
            category.name
         );

         // Verify category goal
         await assertInputVisibility(
            page,
            `budget-category-goal-edit-${category.budget_category_id}`,
            "Goal",
            String(category.goal)
         );
      }
   } else {
      await expect(page.getByTestId(`budget-category-list-${type}`)).toBeHidden();
   }
}

/**
 * Asserts budget category form contains expected field values
 *
 * @param {Page} page - Playwright page instance
 * @param {string} categoryId - Category ID
 * @param {Partial<Record<string, string | number>>} expectedValues - Expected field values
 */
export async function assertBudgetCategoryFormContent(
   page: Page,
   categoryId: string,
   expectedValues: Partial<Record<string, string | number>>
): Promise<void> {
   // Assert name if provided
   if (expectedValues.name !== undefined) {
      await assertInputVisibility(
         page,
         `budget-category-name-edit-${categoryId}`,
         "Name",
         String(expectedValues.name)
      );
   }

   // Assert goal if provided
   if (expectedValues.goal !== undefined) {
      await assertInputVisibility(
         page,
         `budget-category-goal-edit-${categoryId}`,
         "Goal",
         String(expectedValues.goal)
      );
   }

   // Assert type if provided
   if (expectedValues.type !== undefined) {
      await assertInputVisibility(
         page,
         `budget-category-type-edit-${categoryId}`,
         "Type",
         String(expectedValues.type)
      );
   }
}

/**
 * Asserts budget categories in transaction dropdown with proper grouping
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} type - Budget type modal to open
 * @param {BudgetCategoryState[]} expectedIncomeCategories - Expected income categories
 * @param {BudgetCategoryState[]} expectedExpenseCategories - Expected expense categories
 * @param {string} [autoSelectedCategoryId] - Optional category ID to verify auto-selected
 */
export async function assertTransactionBudgetCategoryDropdown(
   page: Page,
   type: "Income" | "Expenses",
   expectedIncomeCategories: BudgetCategoryState[] = [],
   expectedExpenseCategories: BudgetCategoryState[] = [],
   autoSelectedCategoryId?: string
): Promise<void> {
   // Open the budget form modal for the specified type
   await openBudgetForm(page, type);

   // Scroll to transactions section and click "Add Transaction" button within the modal
   const addButton = page.getByRole("button", { name: /add transaction/i });
   await addButton.scrollIntoViewIfNeeded();
   await addButton.click();

   // Get the select input element for auto-selection verification
   const inputElement = page.getByTestId("transaction-budget-category-select");

   // Open the category select dropdown
   const selectElement = page.locator("label:has-text(\"Category\")").locator("..").locator(".MuiSelect-root");
   await selectElement.click({ force: true });

   // Assert Income header is always present
   await expect(page.getByRole("option", { name: "Income" })).toBeVisible();

   // Assert expected income categories appear
   for (const category of expectedIncomeCategories) {
      const option = page.getByRole("option", { name: category.name });
      await expect(option).toBeVisible();
      await expect(option).toContainText(category.name);
   }

   // Assert Expenses header is always present
   await expect(page.getByRole("option", { name: "Expenses" })).toBeVisible();

   // Assert expected expense categories appear
   for (const category of expectedExpenseCategories) {
      const option = page.getByRole("option", { name: category.name });
      await expect(option).toBeVisible();
      await expect(option).toContainText(category.name);
   }

   // Assert auto-selection if specified (Income or Expenses) - future tests will verify transactions with subcategories
   if (autoSelectedCategoryId) {
      await expect(inputElement).toHaveValue(autoSelectedCategoryId);
      await expect(selectElement).toContainText(type);
   }

   // Close the select dropdown by pressing Escape
   await page.keyboard.press("Escape");

   // Close the modal
   await page.keyboard.press("Escape");
}

/**
 * Sets up budget navigation test by updating goals across multiple months based on the provided configuration
 * with goal arrays and explicit month indices to update
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetNavigationTestConfig} config - Configuration with goal arrays and monthsToUpdate indices
 */
export async function setupBudgetNavigationTest(
   page: Page,
   config: BudgetNavigationTestConfig
): Promise<void> {
   const { updatingMonths } = config;

   // Current month index
   let i: number = 0;

   // updatingMonths index
   let j: number = 0;

   while (j < updatingMonths.length) {
      if (i === updatingMonths[j]) {
         const index: number = updatingMonths[j];

         for (const type of ["Income", "Expenses"] as const) {
            // Update the main category
            await updateBudgetCategory(page, "", { goal: config[type].goals[index] }, type);

            // Update the sub categories
            for (const [category, goals] of Object.entries(config[type].categories)) {
               await updateBudgetCategory(page, category, { goal: goals[index] }, type);
            }
         }

         j++;
      }

      i++;
      await navigateBudgetPeriod(page, -1);
   }

   // Navigate back to the current month
   await navigateBudgetPeriod(page, 1 + updatingMonths[j - 1]);
}

/**
 * Verifies budget goals persist correctly across months based on configuration
 * Navigates through all months specified in updatingMonths and validates goal values
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetNavigationTestConfig} config - Configuration with expected goal arrays
 * @param {string} direction - Direction to navigate (forward or backward)
 */
export async function assertBudgetGoalPersistence(
   page: Page,
   config: BudgetNavigationTestConfig,
   direction: "forward" | "backward" = "backward"
): Promise<void> {
   const goals: number = config.Income.goals.length;

   const start = direction === "backward" ? 0 : goals - 1;
   const increment = direction === "backward" ? 1 : -1;
   const end = direction === "backward" ? goals : -1;

   for (let i = start; i !== end; i += increment) {
      // Verify Income main goal and category goal
      await assertBudgetPageState(page, {
         Income: {
            goal: config.Income.goals[i],
            categories: Object.entries(config.Income.categories).map(([categoryId, goals]) => ({ budget_category_id: categoryId, name: "IncomeTest", goal: goals[i] }))
         },
         Expenses: {
            goal: config.Expenses.goals[i],
            categories: Object.entries(config.Expenses.categories).map(([categoryId, goals]) => ({ budget_category_id: categoryId, name: "ExpenseTest", goal: goals[i] }))
         }
      });

      // Navigate to assert further periods
      if (i + increment !== end) {
         // Negate as when navigating forward to assert previous periods, we need to navigate backward, and vice versa for forward navigation
         await navigateBudgetPeriod(page, -increment);
      }
   }
}