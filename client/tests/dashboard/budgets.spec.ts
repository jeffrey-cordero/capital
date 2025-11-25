import { expect, test } from "@tests/fixtures";
import { assertComponentIsHidden, assertComponentIsVisible } from "@tests/utils";
import { BUDGETS_ROUTE } from "@tests/utils/authentication";
import { dragAndDrop } from "@tests/utils/dashboard";
import {
   assertBudgetCategoryOrder,
   assertBudgetFormContent,
   assertBudgetGoalPersistence,
   assertBudgetPageState,
   assertTransactionBudgetCategoryDropdown,
   type BudgetNavigationTestConfig,
   type BudgetPageState,
   cancelBudgetCategoryOperation,
   createBudgetCategory,
   deleteBudgetCategory,
   navigateBudgetPeriod,
   openBudgetForm,
   setupBudgetNavigationTest,
   updateBudgetCategory
} from "@tests/utils/dashboard/budgets";
import { setupAssignedUser } from "@tests/utils/user-management";
import { months } from "@/lib/dates";

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
         const month: number = new Date().getMonth() + 1;
         const year: number = new Date().getFullYear();

         await assertComponentIsVisible(page, "budget-category-progress-Income", "$0.00 / $2,000.00");
         await assertComponentIsVisible(page, "budget-category-progress-Expenses", "$0.00 / $2,000.00");
         await assertComponentIsVisible(page, "budget-period-label", `${months[month - 1]} ${year}`);
      });

      test("should display period navigation controls", async({ page }) => {
         await assertComponentIsVisible(page, "budget-period-previous");
         await assertComponentIsVisible(page, "budget-period-next");
         await assertComponentIsVisible(page, "budget-period-label");

         // Next month navigation should be disabled for the current month
         await expect(page.getByTestId("budget-period-next")).toBeDisabled();

         // Previous month navigation should be enabled for the current month
         await expect(page.getByTestId("budget-period-previous")).toBeEnabled();
      });
   });

   test.describe("Budget Category Creation", () => {
      test.describe("Successful Budget Category Creation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
         });

         test("should successfully create income category", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Salary", goal: 5000 }] }
            });
         });

         test("should successfully create expense category", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Rent", goal: 2000 }, "Expenses");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Rent", goal: 2000 }] }
            });
         });

         test("should successfully create multiple categories in the same type", async({ page }) => {
            const cat1: string = await createBudgetCategory(page, { name: "Groceries", goal: 500 }, "Expenses");
            const cat2: string = await createBudgetCategory(page, { name: "Utilities", goal: 300 }, "Expenses");

            await assertBudgetPageState(page, {
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

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
         });

         test("should validate required name field", async({ page }) => {
            await createBudgetCategory(page, { goal: 1000 }, undefined, {
               "budget-category-name-input": "Name must be at least 1 character"
            });
         });

         test("should validate required goal field", async({ page }) => {
            await createBudgetCategory(page, { name: "TestCategory" } as any, undefined, {
               "budget-category-goal-input": "Goal must be at least $0"
            });
         });

         test("should validate goal minimum bounds (negative)", async({ page }) => {
            await createBudgetCategory(page, { name: "TestCategory", goal: -1 }, undefined, {
               "budget-category-goal-input": "Goal must be at least $0"
            });
         });

         test("should accept large goal values", async({ page }) => {
            const categoryId: string = await createBudgetCategory(
               page,
               { name: "HighValue", goal: 999999.99 }
            );

            await assertBudgetPageState(page, {
               ...baseBudget,
               Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "HighValue", goal: 999999.99 }] }
            });
         });

         test("should accept decimal goal values", async({ page }) => {
            const categoryId: string = await createBudgetCategory(
               page,
               { name: "Precise", goal: 1000.50 }
            );

            await assertBudgetPageState(page, {
               ...baseBudget,
               Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Precise", goal: 1000.50 }] }
            });
         });

         test("should cancel category creation", async({ page }) => {
            // Open budget form for Income and click the Add Category button
            await openBudgetForm(page, "Income");
            const addButton = page.getByRole("button", { name: "Add Category" });
            await addButton.click();

            // Fill name input
            const nameInput = page.getByTestId("budget-category-name-input");
            await nameInput.fill("CanceledCategory");

            // Cancel create operation without saving
            await cancelBudgetCategoryOperation(page, "create");

            // Assert form closed
            await assertComponentIsHidden(page, "budget-category-name-input");
         });
      });
   });

   test.describe("Budget Category Updates", () => {
      test.describe("Successful Budget Category Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
         });

         test("should update category name and verify in modal and page", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "OldName", goal: 1000 }, "Income");
            await updateBudgetCategory(page, categoryId, { name: "NewName", goal: 1000 }, "Income");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "NewName", goal: 1000 }] }
            });
         });

         test("should update category goal and verify in modal and page", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Rent", goal: 2000 }, "Expenses");
            await updateBudgetCategory(page, categoryId, { goal: 2500 }, "Expenses");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Rent", goal: 2500 }] }
            });
         });

         test("should switch category from Income to Expenses", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Transfer", goal: 1000 }, "Income");
            await updateBudgetCategory(page, categoryId, { type: "Expenses", goal: 1000 }, "Income");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Transfer", goal: 1000 }] }
            });
         });

         test("should switch category from Expenses to Income", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Transfer", goal: 500 }, "Expenses");
            await updateBudgetCategory(page, categoryId, { type: "Income", goal: 500 }, "Expenses");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Transfer", goal: 500 }] }
            });
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
         });

         test("should validate updated name (empty is invalid)", async({ page }) => {
            // Create category (automatically opens Income modal)
            const categoryId: string = await createBudgetCategory(page, { name: "Original", goal: 1000 }, "Income");

            // Try to update with empty name
            await updateBudgetCategory(page, categoryId, { name: "", goal: 1000 }, "Income", {
               [`budget-category-name-edit-${categoryId}`]: "Name must be at least 1 character"
            });
         });

         test("should validate updated goal (empty is invalid)", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

            await updateBudgetCategory(page, categoryId, { goal: " " as unknown as number }, "Income", {
               [`budget-category-goal-edit-${categoryId}`]: "Goal must be at least $0"
            });
         });

         test("should validate updated goal minimum bounds (negative)", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

            await updateBudgetCategory(page, categoryId, { goal: -1 }, "Income", {
               [`budget-category-goal-edit-${categoryId}`]: "Goal must be at least $0"
            });
         });

         test("should accept large goal values on update", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");
            await updateBudgetCategory(page, categoryId, { goal: 999999.99 }, "Income");
         });

         test("should accept decimal goal values on update", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");
            await updateBudgetCategory(page, categoryId, { goal: 1234.56 }, "Income");
         });

         test("should cancel category edit", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Original", goal: 1000 }, "Income");

            const editBtn = page.getByTestId(`budget-category-edit-btn-${categoryId}`);
            await editBtn.click();

            const nameInput = page.getByTestId(`budget-category-name-edit-${categoryId}`);
            await nameInput.fill("Modified");

            await cancelBudgetCategoryOperation(page, "edit", categoryId);

            await assertBudgetPageState(page, {
               ...baseBudget,
               Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Original", goal: 1000 }] }
            });
         });
      });
   });

   test.describe("Main Budget Goals", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should create and update main Income budget goal for current period", async({ page }) => {
         // Update main Income goal using helper with empty categoryId
         await updateBudgetCategory(page, "", { goal: 10000 }, "Income");

         // Verify using assertBudgetPageState
         await assertBudgetPageState(page, {
            ...baseBudget,
            Income: { goal: 10000, categories: [] }
         });
      });

      test("should create and update main Expenses budget goal for current period", async({ page }) => {
         // Update main Expenses goal using helper with empty categoryId
         await updateBudgetCategory(page, "", { goal: 5000 }, "Expenses");

         // Verify using assertBudgetPageState
         await assertBudgetPageState(page, {
            ...baseBudget,
            Expenses: { goal: 5000, categories: [] }
         });
      });

      test("should update main budget goal for past month and persist", async({ page }) => {
         // Set initial goal at current month
         await updateBudgetCategory(page, "", { goal: 3000 }, "Income");

         // Navigate back 2 months
         await navigateBudgetPeriod(page, -2);

         // Update main goal at past month
         await updateBudgetCategory(page, "", { goal: 5000 }, "Income");
         await assertBudgetFormContent(page, "Income", { goal: 5000, categories: [] });

         // Navigate forward to current month
         await navigateBudgetPeriod(page, 2);

         // Verify current month still has original goal
         await assertBudgetFormContent(page, "Income", { goal: 3000, categories: [] });
      });
   });

   test.describe("Budget Category Goals", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should set category goal for past month and persist", async({ page }) => {
         // Create 1 Income category with goal 4
         const incomeCat: string = await createBudgetCategory(page, { name: "IncomeSource", goal: 4 }, "Income");
         // Create 1 Expense category with goal 4
         const expenseCat: string = await createBudgetCategory(page, { name: "ExpenseItem", goal: 4 }, "Expenses");

         // Navigate back 3 months
         await navigateBudgetPeriod(page, -3);

         // Verify categories still exist and have goal 4
         await assertBudgetPageState(page, {
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
         await assertBudgetPageState(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: incomeCat, name: "IncomeSource", goal: 4 }] },
            Expenses: { goal: 2000, categories: [{ budget_category_id: expenseCat, name: "ExpenseItem", goal: 4 }] }
         });
      });
   });

   test.describe("Drag and Drop", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should reorder budget categories via drag and drop", async({ page }) => {
         const cat1: string = await createBudgetCategory(page, { name: "Cat1", goal: 100 }, "Income");
         const cat2: string = await createBudgetCategory(page, { name: "Cat2", goal: 200 }, "Income");
         const cat3: string = await createBudgetCategory(page, { name: "Cat3", goal: 300 }, "Income");

         await assertBudgetCategoryOrder(page, [cat1, cat2, cat3]);

         const dragHandle1 = page.getByTestId(`budget-category-drag-${cat1}`);
         const item2 = page.getByTestId(`budget-category-item-${cat2}`);
         await dragAndDrop(page, dragHandle1, item2);
         await assertBudgetCategoryOrder(page, [cat2, cat1, cat3]);

         const dragHandle3 = page.getByTestId(`budget-category-drag-${cat3}`);
         const item2_new = page.getByTestId(`budget-category-item-${cat2}`);
         await dragAndDrop(page, dragHandle3, item2_new);
         await assertBudgetCategoryOrder(page, [cat3, cat2, cat1]);
      });
   });

   test.describe("Budget Category Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should delete category with confirmation", async({ page }) => {
         const categoryId: string = await createBudgetCategory(page, { name: "ToDelete", goal: 500 }, "Expenses");
         await deleteBudgetCategory(page, categoryId, "Expenses", true);

         await assertBudgetPageState(page, {
            ...baseBudget,
            Expenses: { goal: 2000, categories: [] }
         });
      });

      test("should cancel category deletion", async({ page }) => {
         const categoryId: string = await createBudgetCategory(page, { name: "ToKeep", goal: 500 }, "Expenses");
         await deleteBudgetCategory(page, categoryId, "Expenses", false);

         await assertBudgetPageState(page, {
            ...baseBudget,
            Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "ToKeep", goal: 500 }] }
         });
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
         const categoryId: string = await createBudgetCategory(page, { name: "Current", goal: 5000 }, "Income");

         // Navigate backward
         await navigateBudgetPeriod(page, -1);

         // Navigate forward back to current
         await navigateBudgetPeriod(page, 1);

         // Assert category still exists on page
         await assertBudgetPageState(page, {
            ...baseBudget,
            Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Current", goal: 5000 }] }
         });
      });
   });

   test.describe("Budget Goal Persistence", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should persist budget goals across 6 months with multiple updates", async({ page }) => {
         const incomeCatId: string = await createBudgetCategory(page, { name: "IncomeTest", goal: 2000 }, "Income");
         const expenseCatId: string = await createBudgetCategory(page, { name: "ExpenseTest", goal: 2000 }, "Expenses");

         const config: BudgetNavigationTestConfig = {
            updatingMonths: [0, 2, 4],
            Income: {
               goals: [1, 2, 2, 4, 4, 4],
               categories: {
                  [incomeCatId]: [1, 20, 20, 40, 40, 40],
               }
            },
            Expenses: {
               goals: [1, 2, 2, 4, 4, 4],
               categories: {
                  [expenseCatId]: [100, 200, 200, 400, 400, 400]
               }
            }
         };

         await setupBudgetNavigationTest(page, config);

         // Assert backward navigation persistence to six months ago
         await assertBudgetGoalPersistence(page, config, "backward");

         // Assert forward navigation persistence from six months ago to the current month
         await assertBudgetGoalPersistence(page, config, "forward");
      });
   });

   test.describe("Transaction Category Dropdown", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should display empty budget categories in transaction dropdown on initial load", async({ page }) => {
         // Initial state: no budget categories, only Income/Expenses headers
         await assertTransactionBudgetCategoryDropdown(page, "Income", [], []);
      });

      test("should add income category and reflect in transaction dropdown", async({ page }) => {
         // Create an income category
         const categoryId: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");

         // Assert it appears in transaction dropdown under Income
         await assertTransactionBudgetCategoryDropdown(page, "Income", [{ budget_category_id: categoryId, name: "Salary", goal: 5000 }], []);
      });

      test("should add multiple categories and reflect correct grouping in transaction dropdown", async({ page }) => {
         // Create income categories
         const incomeCategory1: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");

         const incomeCategory2: string = await createBudgetCategory(page, { name: "Bonus", goal: 2000 }, "Income");

         // Create expense categories
         const expenseCategory1: string = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");

         const expenseCategory2: string = await createBudgetCategory(page, { name: "Food", goal: 500 }, "Expenses");

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
         const categoryId: string = await createBudgetCategory(page, { name: "Original Name", goal: 5000 }, "Income");

         // Update the category name
         await updateBudgetCategory(page, categoryId, { name: "Updated Name", goal: 5000 }, "Income");

         // Assert updated name appears in dropdown
         await assertTransactionBudgetCategoryDropdown(page, "Income", [{ budget_category_id: categoryId, name: "Updated Name", goal: 5000 }], []);
      });

      test("should move category to different type and reflect in transaction dropdown", async({ page }) => {
         // Create an income category
         const categoryId: string = await createBudgetCategory(page, { name: "Investment", goal: 3000 }, "Income");

         // Update it to Expenses type
         await updateBudgetCategory(page, categoryId, { name: "Investment", goal: 3000, type: "Expenses" }, "Income");

         // Assert it appears in Expenses section of dropdown
         await assertTransactionBudgetCategoryDropdown(page, "Expenses", [], [{ budget_category_id: categoryId, name: "Investment", goal: 3000 }]);
      });

      test("should delete category and remove from transaction dropdown", async({ page }) => {
         // Create an income category
         const incomeId: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");

         // Create an expense category
         const expenseId: string = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");

         // Delete the income category
         await deleteBudgetCategory(page, incomeId, "Income");

         // Assert only expense category appears in dropdown
         await assertTransactionBudgetCategoryDropdown(page, "Expenses", [], [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }]);
      });

      test("should auto-select main category in transaction dropdown", async({ page }) => {
         // Create an income category and an expense category
         const incomeId: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");
         const expenseId: string = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");

         const mainIncomeCategory: string | null = await (page.getByTestId("budget-category-Income").getAttribute("data-category-id"));
         const mainExpenseCategory: string | null = await (page.getByTestId("budget-category-Expenses").getAttribute("data-category-id"));
         expect(mainIncomeCategory).not.toBeNull();
         expect(mainExpenseCategory).not.toBeNull();

         // Assert the income category is available and can be auto-selected when creating transaction
         await assertTransactionBudgetCategoryDropdown(
            page,
            "Income",
            [{ budget_category_id: incomeId, name: "Salary", goal: 5000 }],
            [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }],
            mainIncomeCategory!
         );

         // Assert the expense category is available and can be auto-selected when creating transaction
         await assertTransactionBudgetCategoryDropdown(
            page,
            "Expenses",
            [],
            [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }],
            mainExpenseCategory!
         );
      });
   });
});