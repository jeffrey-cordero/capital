import { expect, type Page, type Response } from "@playwright/test";
import { assertComponentIsVisible, closeModal } from "@tests/utils";
import { assertValidationErrors, submitForm, updateSelectValue } from "@tests/utils/forms";
import { type BudgetCategory } from "capital/budgets";
import { HTTP_STATUS } from "capital/server";

import { months } from "@/lib/dates";
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
 * Budget hierarchy state for page verification, subset of OrganizedBudget structure with only fields needed for verification
 */
export type BudgetTypeState = {
   goal?: number;
   categories?: BudgetCategoryState[];
};

/**
 * Complete budget page state matching OrganizedBudgets structure with both Income and Expenses required for robust assertions
 */
export type BudgetPageState = {
   Income: BudgetTypeState;
   Expenses: BudgetTypeState;
};

/**
 * Single category assertion state for verifying a category on page after navigation
 */
export type SingleCategoryAssertion = {
   categoryId: string;
   name: string;
   goal: number;
};

/**
 * Extended budget category data type for form submission
 */
export type BudgetCategoryFormData = Partial<BudgetCategory> & { goal?: number };

/**
 * Closes the opposite budget type modal if open to ensure only one modal is visible
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} type - Budget type to keep open
 */
async function closeOppositeModal(page: Page, type: "Income" | "Expenses"): Promise<void> {
   const oppositeType = type === "Income" ? "Expenses" : "Income";
   const oppositeModal = page.getByTestId(`budget-form-${oppositeType}`);

   if (await oppositeModal.isVisible()) {
      await closeModal(page, false, `budget-form-${oppositeType}`);
   }
}

/**
 * Opens the budget form modal for a specific type, closing the opposite modal if needed
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} type - Budget type
 */
export async function openBudgetForm(page: Page, type: "Income" | "Expenses"): Promise<void> {
   const targetModal = page.getByTestId(`budget-form-${type}`);

   // If target modal already open, return early
   if (await targetModal.isVisible()) {
      return;
   }

   // Close opposite modal if open to avoid conflicts
   await closeOppositeModal(page, type);

   // Find and click the edit button for the main budget category
   const editButton = page.getByTestId(`budget-category-edit-${type}`);
   await expect(editButton).toBeVisible();
   await expect(editButton).toBeEnabled();
   await editButton.click();

   // Wait for the form modal to become visible
   await assertComponentIsVisible(page, `budget-form-${type}`);
}

/**
 * Navigates the budget period carousel forward or backward, closing any open modals first
 *
 * @param {Page} page - Playwright page instance
 * @param {number} months - Number of months to navigate (positive = forward, negative = backward)
 */
export async function navigateBudgetPeriod(page: Page, months: number): Promise<void> {
   // Close any open modals before navigating
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
 * Opens the create category form within the budget modal
 *
 * @param {Page} page - Playwright page instance
 */
async function openCreateCategoryForm(page: Page): Promise<void> {
   // The "Add Category" button is inside the modal, find it by role and text
   const addButton = page.getByRole("button", { name: "Add Category" });
   await addButton.click();
   await assertComponentIsVisible(page, "budget-category-name-input");
}

/**
 * Creates a new budget category with automatic modal opening if type is specified
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetCategoryFormData} categoryData - Category data
 * @param {string} [type] - Optional budget type (Income or Expenses), opens modal and form if provided
 * @param {Record<string, string>} [expectedErrors] - Optional validation errors to expect
 * @returns {Promise<string>} Created category ID
 */
export async function createBudgetCategory(
   page: Page,
   categoryData: BudgetCategoryFormData,
   type?: "Income" | "Expenses",
   expectedErrors?: Record<string, string>
): Promise<string> {
   // Automatically open the correct modal if type is provided
   if (type) {
      await openBudgetForm(page, type);
      await openCreateCategoryForm(page);
   }

   const formData: Record<string, any> = {};
   if (categoryData.name !== undefined) formData["budget-category-name-input"] = categoryData.name;
   if (categoryData.goal !== undefined) formData["budget-category-goal-input"] = categoryData.goal;

   if (expectedErrors) {
      await submitForm(page, formData, { buttonType: "Create", containsErrors: true });
      await assertValidationErrors(page, expectedErrors);
      return "";
   }

   const responsePromise = page.waitForResponse((response: Response) => {
      return response.url().includes("/api/v1/dashboard/budgets/category") && response.request().method() === "POST";
   });

   await submitForm(page, formData, { buttonType: "Create" });

   const response = await responsePromise;
   expect(response.status()).toBe(HTTP_STATUS.CREATED);

   const responseBody = await response.json();
   const categoryId = responseBody.data?.budget_category_id;

   if (!categoryId) {
      throw new Error("Failed to create budget category - budget_category_id not found in response");
   }

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
 * Updates a budget category via the form, ensuring correct modal is open if type specified
 *
 * @param {Page} page - Playwright page instance
 * @param {categoryId} categoryId - Category ID to update
 * @param {BudgetCategoryFormData} categoryData - Updated category data
 * @param {string} [type] - Optional budget type to ensure correct modal is open
 * @param {Record<string, string>} [expectedErrors] - Optional map of test IDs to expected error messages
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

   // Click edit button for the category
   await page.getByTestId(`budget-category-edit-btn-${categoryId}`).click();

   const formData: Record<string, any> = {};
   if (categoryData.name !== undefined) formData[`budget-category-name-edit-${categoryId}`] = categoryData.name;
   if (categoryData.goal !== undefined) formData[`budget-category-goal-edit-${categoryId}`] = categoryData.goal;
   if (categoryData.type !== undefined) formData[`budget-category-type-edit-${categoryId}`] = categoryData.type;

   // Wait for category and/or budget goal update requests (if no errors expected)
   let responsePromise;
   if (!expectedErrors) {
      responsePromise = page.waitForResponse((response: Response) => {
         return response.url().includes("/api/v1/dashboard/budgets") && (response.request().method() === "PUT" || response.request().method() === "POST");
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
   expect([HTTP_STATUS.NO_CONTENT, HTTP_STATUS.CREATED, HTTP_STATUS.OK]).toContain(response?.status() || 0);
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
 * @param {Array<{name: string, goal: number}>} [subcategories] - Expected subcategories with names and goals
 */
async function assertBudgetCategoryContainer(
   page: Page,
   categoryId: string,
   name: string,
   goal: number,
   subcategories?: Array<{ name: string, goal: number }>
): Promise<void> {
   const container = page.getByTestId(`budget-category-${categoryId}`);
   await assertComponentIsVisible(page, `budget-category-${categoryId}`);
   await expect(container).toContainText(name);
   await expect(container).toContainText(displayCurrency(goal));

   // Validate subcategories if provided
   if (subcategories && subcategories.length > 0) {
      for (const sub of subcategories) {
         const subItem = page.getByTestId(`budget-category-item-${categoryId}`).filter({ hasText: sub.name });
         await expect(subItem).toBeVisible();
         await expect(subItem).toContainText(displayCurrency(sub.goal));
      }
   } else if (subcategories !== undefined) {
      // If subcategories array is provided but empty, ensure no subcategories are shown
      const categoryList = page.getByTestId(`budget-category-list-${categoryId}`);
      await expect(categoryList).toBeHidden();
   }
}

/**
 * Asserts budget category is displayed correctly on the page, closing any open modals first
 *
 * @param {Page} page - Playwright page instance
 * @param {SingleCategoryAssertion} state - Single category state to verify
 */
export async function assertBudgetCategoryPageState(
   page: Page,
   state: SingleCategoryAssertion
): Promise<void> {
   // Close any open modals first
   const incomeModal = page.getByTestId("budget-form-Income");
   const expensesModal = page.getByTestId("budget-form-Expenses");

   if (await incomeModal.isVisible()) {
      await closeModal(page, false, "budget-form-Income");
   } else if (await expensesModal.isVisible()) {
      await closeModal(page, false, "budget-form-Expenses");
   }

   // Assert category on page
   await assertBudgetCategoryContainer(page, state.categoryId, state.name, state.goal);
}

/**
 * Asserts the current budget page state matches expected Income and Expenses categories, goals, and modal content
 *
 * Verifies categories display on the page and validates goal values in both modals.
 *
 * @param {Page} page - Playwright page instance
 * @param {BudgetPageState} state - Expected budget page state with Income/Expenses categories to verify
 */
export async function assertBudgetPageState(
   page: Page,
   state: BudgetPageState
): Promise<void> {
   // Assert categories on page
   for (const type of ["Income", "Expenses"] as const) {
      if (state[type].categories) {
         for (const category of state[type].categories) {
            await assertBudgetCategoryContainer(page, category.budget_category_id, category.name, category.goal);
         }
      }
   }

   // Verify goal in each modal
   for (const type of ["Income", "Expenses"] as const) {
      if (state[type].goal !== undefined) {
         await openBudgetForm(page, type);
         await assertBudgetFormContent(page, type, { goal: state[type].goal });
      }
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
 * Asserts budget period history navigation works correctly for 2 years back and forward
 *
 * @param {Page} page - Playwright page instance
 */
export async function assertBudgetPeriodHistory(page: Page): Promise<void> {
   const currentDate = new Date();
   const currentMonth = months[currentDate.getMonth()];
   const currentYear = currentDate.getFullYear();

   // Navigate back 24 months (2 years)
   for (let i = 0; i < 24; i++) {
      await page.getByTestId("budget-period-previous").click();
      await expect(page.getByTestId("budget-period-display")).toBeVisible();
   }

   // Calculate expected month/year 24 months ago
   const targetDate = new Date(currentDate);
   targetDate.setMonth(targetDate.getMonth() - 24);
   const targetMonth = months[targetDate.getMonth()];
   const targetYear = targetDate.getFullYear();

   await expect(page.getByTestId("budget-period-display")).toContainText(targetMonth);
   await expect(page.getByTestId("budget-period-display")).toContainText(targetYear.toString());

   // Navigate forward 24 months back to current
   for (let i = 0; i < 24; i++) {
      await page.getByTestId("budget-period-next").click();
      await expect(page.getByTestId("budget-period-display")).toBeVisible();
   }

   await expect(page.getByTestId("budget-period-display")).toContainText(currentMonth);
   await expect(page.getByTestId("budget-period-display")).toContainText(currentYear.toString());
}

/**
 * Asserts budget form modal contains expected input values and closes the modal
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} type - Budget type
 * @param {Partial<Record<string, string | number>>} expectedValues - Expected field values (goal, name, type)
 */
export async function assertBudgetFormContent(
   page: Page,
   type: "Income" | "Expenses",
   expectedValues: Partial<Record<string, string | number>>
): Promise<void> {
   // Assert modal is visible
   const modal = page.getByTestId(`budget-form-${type}`);
   await expect(modal).toBeVisible();

   // Assert goal input if provided
   if (expectedValues.goal !== undefined) {
      const goalInput = modal.getByTestId("budget-goal-input");
      await expect(goalInput).toHaveValue(String(expectedValues.goal));
   }

   // Close modal after assertion
   await closeModal(page, false, `budget-form-${type}`);
}

/**
 * Asserts budget category form within edit modal contains expected field values
 *
 * @param {Page} page - Playwright page instance
 * @param {string} categoryId - Category ID
 * @param {Partial<Record<string, string | number>>} expectedValues - Expected field values (name, goal, type)
 */
export async function assertBudgetCategoryFormContent(
   page: Page,
   categoryId: string,
   expectedValues: Partial<Record<string, string | number>>
): Promise<void> {
   const categoryItem = page.getByTestId(`budget-category-item-${categoryId}`);

   // Assert name if provided
   if (expectedValues.name !== undefined) {
      const nameInput = categoryItem.getByTestId(`budget-category-name-edit-${categoryId}`);
      await expect(nameInput).toHaveValue(String(expectedValues.name));
   }

   // Assert goal if provided
   if (expectedValues.goal !== undefined) {
      const goalInput = categoryItem.getByTestId(`budget-category-goal-edit-${categoryId}`);
      await expect(goalInput).toHaveValue(String(expectedValues.goal));
   }

   // Assert type if provided
   if (expectedValues.type !== undefined) {
      const typeSelect = categoryItem.getByTestId(`budget-category-type-edit-${categoryId}`);
      await expect(typeSelect).toHaveValue(String(expectedValues.type));
   }
}

/**
 * Asserts budget categories display correctly in transaction form category dropdown with proper grouping and auto-selection
 *
 * @param {Page} page - Playwright page instance
 * @param {"Income" | "Expenses"} type - Budget type modal to open
 * @param {BudgetCategoryState[]} expectedIncomeCategories - Expected income categories
 * @param {BudgetCategoryState[]} expectedExpenseCategories - Expected expense categories
 * @param {string} [autoSelectedCategoryId] - Optional category ID to verify is auto-selected
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
}