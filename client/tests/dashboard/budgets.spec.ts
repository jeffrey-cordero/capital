import { expect, test } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible, closeModal } from "@tests/utils";
import { BUDGETS_ROUTE } from "@tests/utils/authentication";
import { dragAndDrop } from "@tests/utils/dashboard";
import {
   assertBudgetCategoryOrder,
   assertBudgetCategoryPageState,
   assertBudgetFormContent,
   assertBudgetOnPage,
   assertBudgetPeriodHistory,
   assertTransactionBudgetCategoryDropdown,
   cancelBudgetCategoryOperation,
   createBudgetCategory,
   deleteBudgetCategory,
   openBudgetForm,
   updateBudgetCategory,
   type BudgetPageState
} from "@tests/utils/dashboard/budgets";
import { setupAssignedUser } from "@tests/utils/user-management";

test.describe("Budget Management", () => {
   const baseBudget: BudgetPageState = {
      Income: { goal: 2000, categories: [] },
      Expenses: { goal: 2000, categories: [] }
   };

   test.describe("Initial State", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should display budget page with Income and Expenses sections", async({ page }) => {
         await assertComponentIsVisible(page, "budget-section-Income");
         await assertComponentIsVisible(page, "budget-section-Expenses");
         await assertComponentIsVisible(page, "budget-period-label");
      });

      test("should display period navigation controls", async({ page }) => {
         const prevButton = page.getByTestId("budget-period-previous");
         const nextButton = page.getByTestId("budget-period-next");
         const label = page.getByTestId("budget-period-label");

         await expect(prevButton).toBeVisible();
         await expect(nextButton).toBeVisible();
         await expect(label).toBeVisible();
      });

      test("should have next button disabled for current month", async({ page }) => {
         const nextButton = page.getByTestId("budget-period-next");
         await expect(nextButton).toBeDisabled();
      });
   });

   test.describe("Budget Category Creation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should create income category and verify in modal and page", async({ page }) => {
         // Create category (automatically opens Income modal and verifies in modal)
         const categoryId = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");

         // Assert on page (modal remains open but page elements are still rendered)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Salary", goal: 5000 }] }
         });
      });

      test("should create expense category and verify in modal and page", async({ page }) => {
         // Create category (automatically opens Expenses modal and verifies in modal)
         const categoryId = await createBudgetCategory(page, { name: "Rent", goal: 2000 }, "Expenses");

         // Assert on page (modal remains open but page elements are still rendered)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Rent", goal: 2000 }] }
         });
      });

      test("should create multiple categories in same type", async({ page }) => {
         // First category automatically opens modal and verifies in modal
         const cat1 = await createBudgetCategory(page, { name: "Groceries", goal: 500 }, "Expenses");
         // Second category modal already open and verifies in modal
         const cat2 = await createBudgetCategory(page, { name: "Utilities", goal: 300 }, "Expenses");

         // Assert both on page (modal remains open but page elements are still rendered)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Expenses: {
               goal: 2000,
               categories: [
                  { budget_category_id: cat1, name: "Groceries", goal: 500 },
                  { budget_category_id: cat2, name: "Utilities", goal: 300 }
               ]
            }
         });
      });
   });

   test.describe("Budget Category Creation - Form Validation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
         await openBudgetForm(page, "Income");
         const addButton = page.getByRole("button", { name: "Add Category" });
         await addButton.click();
      });

      test("should validate required name field", async({ page }) => {
         // Leave name empty, fill goal
         const goalInput = page.getByTestId("budget-category-goal-input");
         await goalInput.fill("1000");

         const createButton = page.getByRole("button", { name: "Create" });
         await createButton.click();

         // Assert error
         const nameInput = page.getByTestId("budget-category-name-input");
         const error = nameInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should validate required goal field", async({ page }) => {
         // Fill name, leave goal empty
         const nameInput = page.getByTestId("budget-category-name-input");
         await nameInput.fill("TestCategory");

         const createButton = page.getByRole("button", { name: "Create" });
         await createButton.click();

         // Assert error on goal field
         const goalInput = page.getByTestId("budget-category-goal-input");
         const error = goalInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should validate goal minimum bounds (zero)", async({ page }) => {
         const nameInput = page.getByTestId("budget-category-name-input");
         const goalInput = page.getByTestId("budget-category-goal-input");

         await nameInput.fill("TestCategory");
         await goalInput.fill("0");

         const createButton = page.getByRole("button", { name: "Create" });
         await createButton.click();

         // Assert error for zero/negative goal
         const error = goalInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should validate goal negative values", async({ page }) => {
         const nameInput = page.getByTestId("budget-category-name-input");
         const goalInput = page.getByTestId("budget-category-goal-input");

         await nameInput.fill("TestCategory");
         await goalInput.fill("-500");

         const createButton = page.getByRole("button", { name: "Create" });
         await createButton.click();

         // Assert error
         const error = goalInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should accept large goal values", async({ page }) => {
         const categoryId = await createBudgetCategory(
            page,
            { name: "HighValue", goal: 999999.99 }
         );

         // Assert in modal
         const categoryItem = page.getByTestId(`budget-category-item-${categoryId}`);
         await expect(categoryItem).toBeVisible();
         await expect(categoryItem).toContainText("HighValue");
         await expect(categoryItem).toContainText("$999,999.99");

         // Assert on page (modal remains open)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "HighValue", goal: 999999.99 }] }
         });
      });

      test("should accept decimal goal values", async({ page }) => {
         const categoryId = await createBudgetCategory(
            page,
            { name: "Precise", goal: 1000.50 }
         );

         // Assert in modal
         const categoryItem = page.getByTestId(`budget-category-item-${categoryId}`);
         await expect(categoryItem).toBeVisible();
         await expect(categoryItem).toContainText("Precise");
         await expect(categoryItem).toContainText("$1,000.50");

         // Assert on page (modal remains open)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Precise", goal: 1000.50 }] }
         });
      });

      test("should cancel category creation", async({ page }) => {
         const nameInput = page.getByTestId("budget-category-name-input");
         await nameInput.fill("CanceledCategory");

         // Cancel create operation without saving
         await cancelBudgetCategoryOperation(page, "create");

         // Assert form closed
         await expect(nameInput).toBeHidden();
      });
   });

   test.describe("Budget Category Updates", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should update category name and verify in modal and page", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "OldName", goal: 1000 }, "Income");

         // Update the category
         await updateBudgetCategory(page, categoryId, { name: "NewName" }, "Income");

         // Assert in modal
         const categoryItem = page.getByTestId(`budget-category-item-${categoryId}`);
         await expect(categoryItem).toContainText("NewName");

         // Assert on page (modal remains open)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "NewName", goal: 1000 }] }
         });
      });

      test("should update category goal and verify in modal and page", async({ page }) => {
         // Create category (automatically opens Expenses modal)
         const categoryId = await createBudgetCategory(page, { name: "Rent", goal: 2000 }, "Expenses");

         // Update the goal
         await updateBudgetCategory(page, categoryId, { goal: 2500 }, "Expenses");

         // Assert in modal
         const categoryItem = page.getByTestId(`budget-category-item-${categoryId}`);
         await expect(categoryItem).toContainText("$2,500");

         // Assert on page (modal remains open)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Rent", goal: 2500 }] }
         });
      });

      test("should switch category from Income to Expenses", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "Transfer", goal: 1000 }, "Income");

         // Assert in Income modal
         await expect(page.getByTestId(`budget-category-item-${categoryId}`)).toBeVisible();

         // Switch to Expenses
         await updateBudgetCategory(page, categoryId, { type: "Expenses" }, "Income");

         // Assert removed from Income modal
         await expect(page.getByTestId(`budget-category-item-${categoryId}`)).toBeHidden();

         await closeModal(page, false, "budget-form-Income");

         // Open Expenses modal and verify category is there
         await openBudgetForm(page, "Expenses");
         await expect(page.getByTestId(`budget-category-item-${categoryId}`)).toBeVisible();

         await closeModal(page, false, "budget-form-Expenses");

         // Assert on page in Expenses section
         const expensesSection = page.getByTestId("budget-section-Expenses");
         const categoryInSection = expensesSection.getByTestId(`budget-category-${categoryId}`);
         await expect(categoryInSection).toBeVisible();
      });

      test("should switch category from Expenses to Income", async({ page }) => {
         // Create category (automatically opens Expenses modal)
         const categoryId = await createBudgetCategory(page, { name: "Transfer", goal: 500 }, "Expenses");

         // Switch to Income
         await updateBudgetCategory(page, categoryId, { type: "Income" }, "Expenses");

         // Assert removed from Expenses modal
         await expect(page.getByTestId(`budget-category-item-${categoryId}`)).toBeHidden();

         await closeModal(page, false, "budget-form-Expenses");

         // Open Income modal and verify
         await openBudgetForm(page, "Income");
         await expect(page.getByTestId(`budget-category-item-${categoryId}`)).toBeVisible();

         await closeModal(page, false, "budget-form-Income");

         // Assert on page in Income section
         const incomeSection = page.getByTestId("budget-section-Income");
         const categoryInSection = incomeSection.getByTestId(`budget-category-${categoryId}`);
         await expect(categoryInSection).toBeVisible();
      });
   });

   test.describe("Budget Category Updates - Form Validation", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should validate updated name (empty is invalid)", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "Original", goal: 1000 }, "Income");

         // Click edit button
         const editBtn = page.getByTestId(`budget-category-edit-btn-${categoryId}`);
         await editBtn.click();

         // Clear name
         const nameInput = page.getByTestId(`budget-category-name-edit-${categoryId}`);
         await nameInput.fill("");

         // Try to update
         const updateBtn = page.getByTestId(`budget-category-item-${categoryId}`).getByRole("button", { name: "Update" });
         await updateBtn.click();

         // Assert error
         const error = nameInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should validate updated goal (empty is invalid)", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

         // Click edit button
         const editBtn = page.getByTestId(`budget-category-edit-btn-${categoryId}`);
         await editBtn.click();

         // Clear goal
         const goalInput = page.getByTestId(`budget-category-goal-edit-${categoryId}`);
         await goalInput.fill("");

         // Try to update
         const updateBtn = page.getByTestId(`budget-category-item-${categoryId}`).getByRole("button", { name: "Update" });
         await updateBtn.click();

         // Assert error
         const error = goalInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should validate updated goal minimum bounds (zero)", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

         // Click edit button
         const editBtn = page.getByTestId(`budget-category-edit-btn-${categoryId}`);
         await editBtn.click();

         // Set goal to zero
         const goalInput = page.getByTestId(`budget-category-goal-edit-${categoryId}`);
         await goalInput.fill("0");

         // Try to update
         const updateBtn = page.getByTestId(`budget-category-item-${categoryId}`).getByRole("button", { name: "Update" });
         await updateBtn.click();

         // Assert error
         const error = goalInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should validate updated goal negative values", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

         // Click edit button
         const editBtn = page.getByTestId(`budget-category-edit-btn-${categoryId}`);
         await editBtn.click();

         // Set goal to negative
         const goalInput = page.getByTestId(`budget-category-goal-edit-${categoryId}`);
         await goalInput.fill("-500");

         // Try to update
         const updateBtn = page.getByTestId(`budget-category-item-${categoryId}`).getByRole("button", { name: "Update" });
         await updateBtn.click();

         // Assert error
         const error = goalInput.locator("..").locator("..").locator(".MuiFormHelperText-root");
         await expect(error).toBeVisible();
      });

      test("should accept large goal values on update", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

         // Update with large goal
         await updateBudgetCategory(page, categoryId, { goal: 999999.99 }, "Income");

         // Assert in modal
         const categoryItem = page.getByTestId(`budget-category-item-${categoryId}`);
         await expect(categoryItem).toContainText("$999,999.99");
      });

      test("should accept decimal goal values on update", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

         // Update with decimal goal
         await updateBudgetCategory(page, categoryId, { goal: 1234.56 }, "Income");

         // Assert in modal
         const categoryItem = page.getByTestId(`budget-category-item-${categoryId}`);
         await expect(categoryItem).toContainText("$1,234.56");
      });

      test("should cancel category edit", async({ page }) => {
         // Create category (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "Original", goal: 1000 }, "Income");

         // Click edit button
         const editBtn = page.getByTestId(`budget-category-edit-btn-${categoryId}`);
         await editBtn.click();

         // Modify name
         const nameInput = page.getByTestId(`budget-category-name-edit-${categoryId}`);
         await nameInput.fill("Modified");

         // Cancel edit operation without saving
         await cancelBudgetCategoryOperation(page, "edit", categoryId);

         // Assert category display on page still shows original values (not modified)
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Original", goal: 1000 }] }
         });
      });
   });

   test.describe("Budget Category Goals", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should update main budget goal for current period", async({ page }) => {
         await openBudgetForm(page, "Income");

         // Update main goal
         const goalInput = page.getByTestId("budget-goal-input");
         await goalInput.fill("10000");

         // Submit
         const updateBtn = page.getByRole("button", { name: "Update" });
         await updateBtn.click();

         // Assert in modal
         await assertBudgetFormContent(page, "Income", { goal: 10000 });

         await closeModal(page, false, "budget-form-Income");

         const progressText = page.getByTestId("budget-category-progress-Income");
         await expect(progressText).toContainText("$0");
         await expect(progressText).toContainText("$10,000");
      });

      test("should set goal for past month and persist", async({ page }) => {
         // Create 1 Income category with goal 4
         const incomeCat = await createBudgetCategory(page, { name: "IncomeSource", goal: 4 }, "Income");
         // Create 1 Expense category with goal 4
         const expenseCat = await createBudgetCategory(page, { name: "ExpenseItem", goal: 4 }, "Expenses");

         // Close modal to enable period navigation
         await closeModal(page, false, "budget-form-Expenses");

         // Navigate back 3 months
         const prevButton = page.getByTestId("budget-period-previous");
         for (let i = 0; i < 3; i++) {
            await prevButton.click();
         }

         // Verify categories still exist and have goal 4
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: incomeCat, name: "IncomeSource", goal: 4 }] },
            Expenses: { goal: 2000, categories: [{ budget_category_id: expenseCat, name: "ExpenseItem", goal: 4 }] }
         });

         // Navigate back to current month
         const nextButton = page.getByTestId("budget-period-next");
         for (let i = 0; i < 3; i++) {
            await nextButton.click();
         }

         // Verify goals persisted to current month
         await assertBudgetOnPage(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: incomeCat, name: "IncomeSource", goal: 4 }] },
            Expenses: { goal: 2000, categories: [{ budget_category_id: expenseCat, name: "ExpenseItem", goal: 4 }] }
         });
      });
   });

   test.describe("Drag and Drop", () => {
      test("should reorder budget categories via drag and drop", async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);

         // Create categories in order (automatically opens Income modal)
         const cat1 = await createBudgetCategory(page, { name: "Cat1", goal: 100 }, "Income");
         const cat2 = await createBudgetCategory(page, { name: "Cat2", goal: 200 }, "Income");
         const cat3 = await createBudgetCategory(page, { name: "Cat3", goal: 300 }, "Income");

         // Assert initial order (modal remains open)
         await assertBudgetCategoryOrder(page, [cat1, cat2, cat3]);

         // Drag cat1 to cat2 position
         const dragHandle1 = page.getByTestId(`budget-category-drag-${cat1}`);
         const item2 = page.getByTestId(`budget-category-item-${cat2}`);
         await dragAndDrop(page, dragHandle1, item2);

         // Assert new order
         await assertBudgetCategoryOrder(page, [cat2, cat1, cat3]);

         // Drag cat3 to top
         const dragHandle3 = page.getByTestId(`budget-category-drag-${cat3}`);
         const item2_new = page.getByTestId(`budget-category-item-${cat2}`);
         await dragAndDrop(page, dragHandle3, item2_new);

         // Assert final order
         await assertBudgetCategoryOrder(page, [cat3, cat2, cat1]);
      });
   });

   test.describe("Budget Category Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should delete category with confirmation", async({ page }) => {
         // Create category (automatically opens Expenses modal)
         const categoryId = await createBudgetCategory(page, { name: "ToDelete", goal: 500 }, "Expenses");

         await closeModal(page, false, "budget-form-Expenses");

         // Delete the category
         await deleteBudgetCategory(page, categoryId, "Expenses", true);

         // Assert removed from page
         await assertComponentIsHidden(page, `budget-category-item-${categoryId}`);
      });

      test("should cancel category deletion", async({ page }) => {
         // Create category (automatically opens Expenses modal)
         const categoryId = await createBudgetCategory(page, { name: "ToKeep", goal: 500 }, "Expenses");

         await closeModal(page, false, "budget-form-Expenses");

         // Cancel deletion
         await deleteBudgetCategory(page, categoryId, "Expenses", false);

         // Assert still visible
         await assertComponentIsVisible(page, `budget-category-item-${categoryId}`);
      });
   });

   test.describe("Carousel Behavior", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should not allow selecting future months from current month", async({ page }) => {
         const nextButton = page.getByTestId("budget-period-next");
         await expect(nextButton).toBeDisabled();
      });

      test("should allow navigating backward and forward within 2 years", async({ page }) => {
         // Navigate back 24 months (2 years)
         const prevButton = page.getByTestId("budget-period-previous");
         for (let i = 0; i < 24; i++) {
            await prevButton.click();
         }

         // Navigate forward 24 months
         const nextButton = page.getByTestId("budget-period-next");
         for (let i = 0; i < 24; i++) {
            await nextButton.click();
         }

         // Assert back at current
         await expect(nextButton).toBeDisabled();
      });

      test("should preserve budget data across period navigation", async({ page }) => {
         // Create category at current period (automatically opens Income modal)
         const categoryId = await createBudgetCategory(page, { name: "Current", goal: 5000 }, "Income");

         // Close modal
         await closeModal(page, false, "budget-form-Income");

         // Navigate backward
         const prevButton = page.getByTestId("budget-period-previous");
         await prevButton.click();

         // Navigate forward back to current
         const nextButton = page.getByTestId("budget-period-next");
         await nextButton.click();

         // Assert category still exists on page
         await assertBudgetCategoryPageState(page, { categoryId, name: "Current", goal: 5000 });
      });
   });

   test.describe("Period History", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should navigate through 2 years of history", async({ page }) => {
         await assertBudgetPeriodHistory(page);
      });
   });

   test.describe("Transaction Category Dropdown", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
      });

      test("should display empty budget categories in transaction dropdown on initial load", async({ page }) => {
         // Initial state: no budget categories, only Income/Expenses headers
         await assertTransactionBudgetCategoryDropdown(page, "Income", [], []);
      });

      test("should add income category and reflect in transaction dropdown", async({ page }) => {
         // Create an income category
         const categoryId = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");

         // Close modal
         await closeModal(page, false, "budget-form-Income");

         // Assert it appears in transaction dropdown under Income
         await assertTransactionBudgetCategoryDropdown(page, "Income", [{ budget_category_id: categoryId, name: "Salary", goal: 5000 }], []);
      });

      test("should add multiple categories and reflect correct grouping in transaction dropdown", async({ page }) => {
         // Create income categories
         const incomeCategory1 = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");
         await closeModal(page, false, "budget-form-Income");

         const incomeCategory2 = await createBudgetCategory(page, { name: "Bonus", goal: 2000 }, "Income");
         await closeModal(page, false, "budget-form-Income");

         // Create expense categories
         const expenseCategory1 = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");
         await closeModal(page, false, "budget-form-Expenses");

         const expenseCategory2 = await createBudgetCategory(page, { name: "Food", goal: 500 }, "Expenses");
         await closeModal(page, false, "budget-form-Expenses");

         // Assert all categories appear in correct sections
         await assertTransactionBudgetCategoryDropdown(
            page,
            "Income",
            [
               { budget_category_id: incomeCategory1, name: "Salary", goal: 5000 },
               { budget_category_id: incomeCategory2, name: "Bonus", goal: 2000 }
            ],
            [
               { budget_category_id: expenseCategory1, name: "Rent", goal: 1500 },
               { budget_category_id: expenseCategory2, name: "Food", goal: 500 }
            ]
         );
      });

      test("should update category name and reflect in transaction dropdown", async({ page }) => {
         // Create a category
         const categoryId = await createBudgetCategory(page, { name: "Original Name", goal: 5000 }, "Income");
         await closeModal(page, false, "budget-form-Income");

         // Update the category name
         await updateBudgetCategory(page, categoryId, { name: "Updated Name", goal: 5000 }, "Income");
         await closeModal(page, false, "budget-form-Income");

         // Assert updated name appears in dropdown
         await assertTransactionBudgetCategoryDropdown(page, "Income", [{ budget_category_id: categoryId, name: "Updated Name", goal: 5000 }], []);
      });

      test("should move category to different type and reflect in transaction dropdown", async({ page }) => {
         // Create an income category
         const categoryId = await createBudgetCategory(page, { name: "Investment", goal: 3000 }, "Income");
         await closeModal(page, false, "budget-form-Income");

         // Update it to Expenses type
         await updateBudgetCategory(page, categoryId, { name: "Investment", goal: 3000, type: "Expenses" }, "Income");
         await closeModal(page, false, "budget-form-Expenses");

         // Assert it appears in Expenses section of dropdown
         await assertTransactionBudgetCategoryDropdown(page, "Expenses", [], [{ budget_category_id: categoryId, name: "Investment", goal: 3000 }]);
      });

      test("should delete category and remove from transaction dropdown", async({ page }) => {
         // Create an income category
         const incomeId = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");
         await closeModal(page, false, "budget-form-Income");

         // Create an expense category
         const expenseId = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");
         await closeModal(page, false, "budget-form-Expenses");

         // Delete the income category
         await deleteBudgetCategory(page, incomeId, "Income");

         // Assert only expense category appears in dropdown
         await assertTransactionBudgetCategoryDropdown(page, "Expenses", [], [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }]);
      });

      test("should auto-select category in transaction dropdown when from update context", async({ page }) => {
         // Create an income category and an expense category
         const incomeId = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");
         await closeModal(page, false, "budget-form-Income");

         const expenseId = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");
         await closeModal(page, false, "budget-form-Expenses");

         // Assert the expense category is available and can be auto-selected when creating transaction
         await assertTransactionBudgetCategoryDropdown(
            page,
            "Income",
            [{ budget_category_id: incomeId, name: "Salary", goal: 5000 }],
            [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }],
            expenseId
         );
      });
   });

});