import { expect, test } from "@tests/fixtures";
import { assertComponentIsVisible } from "@tests/utils";
import { BUDGETS_ROUTE } from "@tests/utils/authentication";
import { dragAndDrop } from "@tests/utils/dashboard";
import {
   assertBudgetCategoryOrder,
   assertBudgetGoalPersistence,
   assertBudgetPageState,
   assertTransactionBudgetCategoryDropdown,
   type BudgetNavigationTestConfig,
   type BudgetPageState,
   createBudgetCategory,
   deleteBudgetCategory,
   performAndAssertCancelBudgetCategory,
   setupBudgetGoalPersistence,
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

         await assertComponentIsVisible(page, "budget-category-goal-Income", "$0.00 / $2,000.00");
         await assertComponentIsVisible(page, "budget-category-goal-Expenses", "$0.00 / $2,000.00");
         await assertComponentIsVisible(page, "budget-period-label", `${months[month - 1]} ${year}`);
      });

      test("should display period navigation controls", async({ page }) => {
         await assertComponentIsVisible(page, "budget-period-previous");
         await assertComponentIsVisible(page, "budget-period-next");
         await assertComponentIsVisible(page, "budget-period-label");

         // For the current month, future navigation should be disabled and previous navigation should be enabled
         await expect(page.getByTestId("budget-period-next")).toBeDisabled();
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
            const category1: string = await createBudgetCategory(page, { name: "Groceries", goal: 500.75 }, "Expenses");
            const category2: string = await createBudgetCategory(page, { name: "Utilities", goal: 300.50 }, "Expenses");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Expenses: {
                  goal: 2000,
                  categories: [
                     { budget_category_id: category1, name: "Groceries", goal: 500.75 },
                     { budget_category_id: category2, name: "Utilities", goal: 300.50 }
                  ]
               }
            });
         });
      });

      test.describe("Form Validation", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE);
         });

         test("should validate name minimum length", async({ page }) => {
            await createBudgetCategory(page, { goal: 1000 }, undefined, {
               "budget-category-name-input": "Name must be at least 1 character"
            });
         });

         test("should validate name maximum name length", async({ page }) => {
            await createBudgetCategory(page, { name: "a".repeat(31), goal: 1000 }, undefined, {
               "budget-category-name-input": "Name must be at most 30 characters"
            });
         });

         test("should validate required goal field", async({ page }) => {
            await createBudgetCategory(page, { name: "Test Category", goal: "" as unknown as number }, undefined, {
               "budget-category-goal-input": "Goal must be at least $0"
            });
         });

         test("should validate goal minimum bounds", async({ page }) => {
            await createBudgetCategory(page, { name: "Test Category", goal: -1 }, undefined, {
               "budget-category-goal-input": "Goal must be at least $0"
            });
         });

         test("should validate goal maximum bounds", async({ page }) => {
            await createBudgetCategory(page, { name: "Test Category", goal: 1_000_000_000_000 }, undefined, {
               "budget-category-goal-input": "Goal exceeds the maximum allowed value"
            });
         });
      });
   });

   test.describe("Budget Category Updates", () => {
      test.describe("Successful Budget Category Updates", () => {
         test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
            await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
         });

         test("should successfully update category name", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Old Name", goal: 1000 }, "Income");
            await updateBudgetCategory(page, categoryId, { name: "New Name", goal: 1000 }, "Income");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Income: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "New Name", goal: 1000 }] }
            });
         });

         test("should successfully update category goal", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Rent", goal: 2000 }, "Expenses");
            await updateBudgetCategory(page, categoryId, { goal: 2500 }, "Expenses");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Rent", goal: 2500 }] }
            });
         });

         test("should successfully switch category from Income to Expenses", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Transfer", goal: 1000 }, "Income");
            await updateBudgetCategory(page, categoryId, { type: "Expenses", goal: 1000 }, "Income");

            await assertBudgetPageState(page, {
               ...baseBudget,
               Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "Transfer", goal: 1000 }] }
            });
         });

         test("should successfully switch category from Expenses to Income", async({ page }) => {
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

         test("should validate updated name minimum length", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Original", goal: 1000 }, "Income");

            await updateBudgetCategory(page, categoryId, { name: "", goal: 1000 }, "Income", {
               [`budget-category-name-edit-${categoryId}`]: "Name must be at least 1 character"
            });
         });

         test("should validate updated name maximum length", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "Original", goal: 1000 }, "Income");

            await updateBudgetCategory(page, categoryId, { name: "a".repeat(31), goal: 1000 }, "Income", {
               [`budget-category-name-edit-${categoryId}`]: "Name must be at most 30 characters"
            });
         });

         test("should validate empty updated goal value", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

            await updateBudgetCategory(page, categoryId, { goal: " " as unknown as number }, "Income", {
               [`budget-category-goal-edit-${categoryId}`]: "Goal must be at least $0"
            });
         });

         test("should validate updated goal minimum bounds", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

            await updateBudgetCategory(page, categoryId, { goal: -1 }, "Income", {
               [`budget-category-goal-edit-${categoryId}`]: "Goal must be at least $0"
            });
         });

         test("should validate updated goal maximum bounds", async({ page }) => {
            const categoryId: string = await createBudgetCategory(page, { name: "TestCat", goal: 1000 }, "Income");

            await updateBudgetCategory(page, categoryId, { goal: 1_000_000_000_000 }, "Income", {
               [`budget-category-goal-edit-${categoryId}`]: "Goal exceeds the maximum allowed value"
            });
         });
      });
   });

   test.describe("Budget Category Goals", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should persist default budget goals across 12 months for both Income and Expenses", async({ page }) => {
         // Default goals for the current month should persist in the past for all prior months
         const goals: number[] = Array(12).fill(2000);
         const config: BudgetNavigationTestConfig = {
            updatingMonths: [],
            Income: {
               goals: goals,
               categories: {}
            },
            Expenses: {
               goals: goals,
               categories: {}
            }
         };

         await assertBudgetGoalPersistence(page, config, "backward");
         await assertBudgetGoalPersistence(page, config, "forward");
      });

      test("should persist various budget goals across 6 months with multiple intermediate updates", async({ page }) => {
         const incomeCategoryId: string = await createBudgetCategory(page, { name: "Income Test", goal: 2000 }, "Income");
         const expenseCategoryId: string = await createBudgetCategory(page, { name: "Expense Test", goal: 2000 }, "Expenses");

         const config: BudgetNavigationTestConfig = {
            // Goals extend up to months with existing records and the last goal in the past persists across all prior months
            updatingMonths: [0, 2, 4],
            Income: {
               goals: [1, 2, 2, 4, 4, 4],
               categories: {
                  [incomeCategoryId]: [1, 20, 20, 40, 40, 40]
               }
            },
            Expenses: {
               goals: [1, 2, 2, 4, 4, 4],
               categories: {
                  [expenseCategoryId]: [100, 200, 200, 400, 400, 400]
               }
            }
         };

         await setupBudgetGoalPersistence(page, config);

         await assertBudgetGoalPersistence(page, config, "backward");
         await assertBudgetGoalPersistence(page, config, "forward");
      });
   });

   test.describe("Budget Category Deletion", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should delete category with confirmation", async({ page }) => {
         const categoryId: string = await createBudgetCategory(page, { name: "To Delete", goal: 500 }, "Expenses");
         await deleteBudgetCategory(page, categoryId, "Expenses", true);

         await assertBudgetPageState(page, {
            ...baseBudget,
            Expenses: { goal: 2000, categories: [] }
         });
      });

      test("should cancel budget category deletion", async({ page }) => {
         const categoryId: string = await createBudgetCategory(page, { name: "To Keep", goal: 500 }, "Expenses");
         await deleteBudgetCategory(page, categoryId, "Expenses", false);

         await assertBudgetPageState(page, {
            ...baseBudget,
            Expenses: { goal: 2000, categories: [{ budget_category_id: categoryId, name: "To Keep", goal: 500 }] }
         });
      });
   });

   test.describe("Drag and Drop", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should reorder budget categories via drag and drop", async({ page }) => {
         const category1: string = await createBudgetCategory(page, { name: "Category 1", goal: 100 }, "Income");
         const category2: string = await createBudgetCategory(page, { name: "Category 2", goal: 200 }, "Income");
         const category3: string = await createBudgetCategory(page, { name: "Category 3", goal: 300 }, "Income");

         await assertBudgetCategoryOrder(page, [category1, category2, category3]);

         const dragHandle1 = page.getByTestId(`budget-category-drag-${category1}`);
         const item2 = page.getByTestId(`budget-category-item-${category2}`);
         await dragAndDrop(page, dragHandle1, item2);
         await assertBudgetCategoryOrder(page, [category2, category1, category3]);

         const dragHandle3 = page.getByTestId(`budget-category-drag-${category3}`);
         await dragAndDrop(page, dragHandle3, item2);
         await assertBudgetCategoryOrder(page, [category3, category2, category1]);
      });
   });

   test.describe("Cancel Behavior", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should cancel budget category creation", async({ page }) => {
         await performAndAssertCancelBudgetCategory(page, baseBudget, "create_category");
      });

      test("should cancel main budget goal updates", async({ page }) => {
         await performAndAssertCancelBudgetCategory(page, baseBudget, "update_main_category");
      });

      test("should cancel sub-budget goal updates", async({ page }) => {
         await performAndAssertCancelBudgetCategory(page, baseBudget, "update_sub_category");
      });
   });

   test.describe("Transaction Form Integration", () => {
      test.beforeEach(async({ page, usersRegistry, assignedRegistry }) => {
         await setupAssignedUser(page, usersRegistry, assignedRegistry, BUDGETS_ROUTE, true, true);
      });

      test("should display empty budget categories in transaction dropdown on initial load", async({ page }) => {
         await assertTransactionBudgetCategoryDropdown(page, "Income", [], []);
      });

      test("should add income category and reflect in transaction dropdown", async({ page }) => {
         const categoryId: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");

         await assertTransactionBudgetCategoryDropdown(page, "Income", [{ budget_category_id: categoryId, name: "Salary", goal: 5000 }], []);
      });

      test("should add multiple categories and reflect correct grouping in transaction dropdown", async({ page }) => {
         const incomeCategory1: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");
         const incomeCategory2: string = await createBudgetCategory(page, { name: "Bonus", goal: 2000 }, "Income");

         const expenseCategory1: string = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");
         const expenseCategory2: string = await createBudgetCategory(page, { name: "Food", goal: 500 }, "Expenses");

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
         const categoryId: string = await createBudgetCategory(page, { name: "Original Name", goal: 5000 }, "Income");
         await updateBudgetCategory(page, categoryId, { name: "Updated Name", goal: 5000 }, "Income");

         await assertTransactionBudgetCategoryDropdown(page, "Income", [{ budget_category_id: categoryId, name: "Updated Name", goal: 5000 }], []);
      });

      test("should move category to different type and reflect in transaction dropdown", async({ page }) => {
         const categoryId: string = await createBudgetCategory(page, { name: "Investment", goal: 3000 }, "Income");
         await updateBudgetCategory(page, categoryId, { name: "Investment", goal: 3000, type: "Expenses" }, "Income");

         await assertTransactionBudgetCategoryDropdown(page, "Expenses", [], [{ budget_category_id: categoryId, name: "Investment", goal: 3000 }]);
      });

      test("should delete category and remove from transaction dropdown", async({ page }) => {
         const incomeId: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");
         const expenseId: string = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");

         await deleteBudgetCategory(page, incomeId, "Income");
         await assertTransactionBudgetCategoryDropdown(page, "Expenses", [], [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }]);
      });

      test("should auto-select main category in transaction dropdown", async({ page }) => {
         const incomeId: string = await createBudgetCategory(page, { name: "Salary", goal: 5000 }, "Income");
         const expenseId: string = await createBudgetCategory(page, { name: "Rent", goal: 1500 }, "Expenses");

         // Main budget categories should be auto-selected in the transaction dropdown with their actual UUIDs
         const mainIncomeCategory: string | null = await (page.getByTestId("budget-category-Income").getAttribute("data-category-id"));
         const mainExpenseCategory: string | null = await (page.getByTestId("budget-category-Expenses").getAttribute("data-category-id"));
         expect(mainIncomeCategory).not.toBeNull();
         expect(mainExpenseCategory).not.toBeNull();

         await assertTransactionBudgetCategoryDropdown(
            page,
            "Income",
            [{ budget_category_id: incomeId, name: "Salary", goal: 5000 }],
            [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }],
            mainIncomeCategory!
         );

         await assertTransactionBudgetCategoryDropdown(
            page,
            "Expenses",
            [{ budget_category_id: incomeId, name: "Salary", goal: 5000 }],
            [{ budget_category_id: expenseId, name: "Rent", goal: 1500 }],
            mainExpenseCategory!
         );
      });
   });
});