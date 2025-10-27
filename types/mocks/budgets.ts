import type {
   BudgetCategory,
   BudgetGoal,
   BudgetPeriod,
   BudgetType,
   OrganizedBudgets
} from "../budgets";

/**
 * Creates a valid budget category
 *
 * @param {BudgetType} type - Budget category type (Income or Expenses)
 * @returns {Partial<BudgetCategory>} Budget category data
 */
export const createBudgetCategory = (type: BudgetType = "Expenses"): Partial<BudgetCategory> => ({
   name: `Budget-${Date.now()}`,
   type,
   budget_category_id: `budget-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
   goals: [],
   goalIndex: 0,
   category_order: 0
});

/**
 * Creates a valid budget goal
 *
 * @param {number} goal - Goal amount (defaults to 500.00)
 * @param {number} month - Goal month (defaults to current month)
 * @param {number} year - Goal year (defaults to current year)
 * @returns {BudgetGoal} Budget goal data
 */
export const createBudgetGoal = (goal: number = 500.00, month?: number, year?: number): BudgetGoal => {
   const now = new Date();
   return {
      goal,
      month: month ?? now.getMonth() + 1,
      year: year ?? now.getFullYear()
   };
};

/**
 * Creates an income budget category
 *
 * @returns {Partial<BudgetCategory>} Income budget category data
 */
export const createIncomeBudgetCategory = (): Partial<BudgetCategory> => ({
   ...createBudgetCategory("Income"),
   name: `Income-${Date.now()}`
});

/**
 * Creates an expenses budget category
 *
 * @returns {Partial<BudgetCategory>} Expenses budget category data
 */
export const createExpensesBudgetCategory = (): Partial<BudgetCategory> => ({
   ...createBudgetCategory("Expenses"),
   name: `Expenses-${Date.now()}`
});

/**
 * Creates a budget category with goals
 *
 * @param {BudgetType} type - Budget category type
 * @param {number} goalCount - Number of goals to create (defaults to 3)
 * @returns {Partial<BudgetCategory>} Budget category with goals
 */
export const createBudgetCategoryWithGoals = (type: BudgetType = "Expenses", goalCount: number = 3): Partial<BudgetCategory> => {
   const goals: BudgetGoal[] = [];
   const now = new Date();

   for (let i = 0; i < goalCount; i++) {
      const month = now.getMonth() + 1 - i;
      const year = month <= 0 ? now.getFullYear() - 1 : now.getFullYear();
      const adjustedMonth = month <= 0 ? 12 + month : month;

      goals.push(createBudgetGoal(500.00 + (i * 100), adjustedMonth, year));
   }

   return {
      ...createBudgetCategory(type),
      goals,
      goalIndex: 0
   };
};

/**
 * Creates a budget goal for a specific period
 *
 * @param {BudgetPeriod} period - Budget period (month and year)
 * @param {number} goal - Goal amount
 * @returns {BudgetGoal} Budget goal for the specified period
 */
export const createBudgetGoalForPeriod = (period: BudgetPeriod, goal: number = 500.00): BudgetGoal => ({
   goal,
   month: period.month,
   year: period.year
});

/**
 * Creates a custom budget category with overrides
 *
 * @param {Partial<BudgetCategory>} overrides - Properties to override
 * @returns {Partial<BudgetCategory>} Budget category with custom properties
 */
export const createCustomBudgetCategory = (overrides: Partial<BudgetCategory> = {}): Partial<BudgetCategory> => ({
   ...createBudgetCategory(),
   ...overrides
});

/**
 * Creates an organized budget structure
 *
 * @returns {Partial<OrganizedBudgets>} Organized budget structure
 */
export const createOrganizedBudgets = (): Partial<OrganizedBudgets> => ({
   Income: {
      budget_category_id: `income-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      goalIndex: 0,
      goals: [createBudgetGoal(3000.00)],
      categories: []
   },
   Expenses: {
      budget_category_id: `expenses-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      goalIndex: 0,
      goals: [createBudgetGoal(2500.00)],
      categories: []
   }
});