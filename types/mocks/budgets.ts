import type {
   Budget,
   BudgetCategory,
   BudgetCategoryGoal,
   BudgetGoal,
   BudgetType,
   OrganizedBudget,
   OrganizedBudgets
} from "../budgets";

/**
 * Test budget category ID for unit tests
 */
export const TEST_BUDGET_CATEGORY_ID: string = "550e8400-e29b-41d4-a716-446655440010";

/**
 * Test budget category IDs array for ordering tests
 */
export const TEST_BUDGET_CATEGORY_IDS: string[] = [
   "550e8400-e29b-41d4-a716-446655440011",
   "550e8400-e29b-41d4-a716-446655440012",
   "550e8400-e29b-41d4-a716-446655440013"
];

/**
 * Valid budget category test data template
 */
export const VALID_BUDGET_CATEGORY: Omit<BudgetCategory, "budget_category_id"> = {
   type: "Expenses",
   name: "Groceries",
   category_order: 0,
   goals: [],
   goalIndex: 0
};

/**
 * Valid budget test data template
 */
export const VALID_BUDGET: Omit<Budget, "budget_category_id"> = {
   goal: 500.00,
   year: new Date().getFullYear(),
   month: new Date().getMonth() + 1
};

/**
 * Gets year and month for a given number of months in the past
 *
 * @param {number} [monthsBack] - Number of months to go back (default `0` for current month)
 * @returns {{ year: number; month: number }} Year and month object
 */
export const getPastMonthAndYear = (monthsBack: number = 0): { year: number; month: number } => {
   let year = new Date().getFullYear();
   let month = new Date().getMonth() + 1 - monthsBack;

   // Wrap month to previous year if it goes below 1
   if (month < 1) {
      month = 12 + month;
      year -= 1;
   }

   return { year, month };
};

/**
 * Gets year and month for a given number of months in the future
 *
 * @param {number} [monthsForward] - Number of months to go forward (default `1` for next month)
 * @returns {{ year: number; month: number }} Year and month object
 */
export const getFutureMonthAndYear = (monthsForward: number = 1): { year: number; month: number } => {
   let year = new Date().getFullYear();
   let month = new Date().getMonth() + 1 + monthsForward;

   // Wrap month to next year if it exceeds 12
   if (month > 12) {
      month = month - 12;
      year += 1;
   }

   return { year, month };
};

/**
 * Creates a valid budget category for testing
 *
 * @param {Partial<BudgetCategory>} [overrides] - Optional properties to override
 * @returns {BudgetCategory} Valid budget category object
 */
export const createValidBudgetCategory = (overrides?: Partial<BudgetCategory>): BudgetCategory => {
   return {
      budget_category_id: TEST_BUDGET_CATEGORY_ID,
      ...VALID_BUDGET_CATEGORY,
      ...overrides
   };
};

/**
 * Creates an array of mock budget categories for testing
 *
 * @param {number} [count] - Number of categories to create (default `2`)
 * @param {BudgetType} [type] - Budget type to create (default `Expenses`)
 * @returns {BudgetCategory[]} Array of budget category objects
 */
export const createMockBudgetCategories = (
   count: number = 2,
   type: BudgetType = "Expenses"
): BudgetCategory[] => {
   const categories: BudgetCategory[] = [];
   const categoryNames: string[] = ["Groceries", "Utilities", "Entertainment", "Transportation", "Healthcare"];

   for (let i = 0; i < count; i++) {
      categories.push({
         budget_category_id: `00000000-0000-0000-0000-${String(i + 11).padStart(12, "0")}`,
         type,
         name: categoryNames[i % categoryNames.length],
         category_order: i,
         goals: [],
         goalIndex: 0
      });
   }

   return categories;
};

/**
 * Creates a valid budget for testing
 *
 * @param {Partial<Budget>} [overrides] - Optional properties to override
 * @returns {Budget} Valid budget object
 */
export const createValidBudget = (overrides?: Partial<Budget>): Budget => {
   return {
      budget_category_id: TEST_BUDGET_CATEGORY_ID,
      ...VALID_BUDGET,
      ...overrides
   };
};

/**
 * Creates an array of mock budgets for testing
 *
 * @param {number} [count] - Number of budgets to create (default `2`)
 * @returns {Budget[]} Array of budget objects
 */
export const createMockBudgets = (count: number = 2): Budget[] => {
   const budgets: Budget[] = [];

   for (let i = 0; i < count; i++) {
      const { year, month } = getPastMonthAndYear(i + 1);

      budgets.push({
         budget_category_id: `00000000-0000-0000-0000-${String(i + 11).padStart(12, "0")}`,
         goal: (i + 1) * 500.00,
         year,
         month
      });
   }

   return budgets;
};

/**
 * Creates a mock budget goal for testing
 *
 * @param {Partial<BudgetGoal>} [overrides] - Optional properties to override
 * @returns {BudgetGoal} Budget goal object
 */
export const createValidBudgetGoal = (overrides?: Partial<BudgetGoal>): BudgetGoal => {
   const currentYear = new Date().getFullYear();
   const currentMonth = new Date().getMonth() + 1;

   return {
      goal: 500.00,
      year: currentYear,
      month: currentMonth,
      ...overrides
   };
};

/**
 * Creates an array of mock budget goals for testing
 *
 * @param {number} [count] - Number of goals to create (default `2`)
 * @returns {BudgetGoal[]} Array of budget goal objects
 */
export const createMockBudgetGoals = (count: number = 2): BudgetGoal[] => {
   const goals: BudgetGoal[] = [];

   for (let i = 0; i < count; i++) {
      const { year, month } = getPastMonthAndYear(i + 1);

      goals.push({
         goal: (i + 1) * 500.00,
         year,
         month
      });
   }

   return goals;
};

/**
 * Creates a valid organized budget (Income or Expenses section) for testing
 *
 * @param {BudgetType} [type] - Budget type (default `Expenses`)
 * @param {number} [categoryCount] - Number of subcategories (default `2`)
 * @returns {OrganizedBudget} Organized budget structure
 */
export const createValidOrganizedBudget = (type: BudgetType = "Expenses", categoryCount: number = 2): OrganizedBudget => {
   const categories = createMockBudgetCategories(categoryCount, type);
   const goals = createMockBudgetGoals(2);

   // Assign goals to categories
   categories.forEach((category, index) => {
      category.goals = [goals[index % goals.length]];
   });

   return {
      budget_category_id: "00000000-0000-0000-0000-000000000001",
      goalIndex: 0,
      goals: goals.slice(0, 1),
      categories
   };
};

/**
 * Creates a complete valid organized budgets structure for testing
 *
 * @param {number} [incomeCount] - Number of income categories (default `2`)
 * @param {number} [expenseCount] - Number of expense categories (default `2`)
 * @returns {OrganizedBudgets} Complete organized budgets with Income and Expenses
 */
export const createValidOrganizedBudgets = (incomeCount: number = 2, expenseCount: number = 2): OrganizedBudgets => {
   return {
      Income: createValidOrganizedBudget("Income", incomeCount),
      Expenses: createValidOrganizedBudget("Expenses", expenseCount)
   };
};

/**
 * Creates a valid budget entry with an associated budget category for testing
 *
 * @param {Partial<BudgetCategory>} [categoryOverrides] - Category field overrides
 * @param {Partial<Budget>} [budgetOverrides] - Budget field overrides
 * @returns {BudgetCategoryGoal} Combined category and budget object
 */
export const createValidBudgetEntry = (categoryOverrides?: Partial<BudgetCategory>, budgetOverrides?: Partial<Budget>): BudgetCategoryGoal => {
   const category = createValidBudgetCategory(categoryOverrides);
   const budget = createValidBudget(budgetOverrides);

   return { ...category, ...budget };
};