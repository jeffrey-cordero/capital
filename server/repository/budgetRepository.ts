import { Budget, BudgetCategory, BudgetType, OrganizedBudgets } from "capital/budgets";

import { FIRST_PARAM, query } from "@/lib/database";

export async function findByUserId(user_id: string): Promise<OrganizedBudgets> {
   // Retrieves all budgets for a user organized by type, year, month, and category
   const categoriesQuery = `
      SELECT *
      FROM budget_categories
      WHERE user_id = $1
      ORDER BY type, category_order ASC;
   `;
   const categories = await query(categoriesQuery, [user_id]) as BudgetCategory[];

   // Create a map of category IDs to their respective category objects
   const categoriesMap: Record<string, BudgetCategory> = categories.reduce((acc: Record<string, BudgetCategory>, category) => {
      acc[category.budget_category_id] = category;
      return acc;
   }, {});

   // Fetch all budgets for the user
   const budgetsQuery = `
      SELECT *
      FROM budgets
      WHERE user_id = $1
      ORDER BY year DESC, month DESC;
  `;
   const budgets = await query(budgetsQuery, [user_id]) as Budget[];

   // Initialize organized budgets structure
   const result: OrganizedBudgets = {
      Income: {
         goals: [],
         categories: []
      },
      Expenses: {
         goals: [],
         categories: []
      }
   };

   // Initialize category positions tracking
   const categoryPositions: Record<BudgetType, Record<string, number>> = {
      "Income": {},
      "Expenses": {}
   };

   // Organize budgets by their type and categories
   for (const budget of budgets) {
      const type: BudgetType = budget.type;

      // Handle main budget (Income or Expenses) goals
      if (!budget.budget_category_id || !categoriesMap[budget.budget_category_id]) {
         result[type].goals.push(budget);
         continue;
      }

      // Find the matching budget category
      const category: BudgetCategory = categoriesMap[budget.budget_category_id];
      const categoryIndex: number = categoryPositions[type][category.budget_category_id];

      if (categoryIndex === undefined) {
         // New category found, add it to the categories array
         categoryPositions[type][category.budget_category_id] = result[type].categories.length;
         result[type].categories.push([category, []]);
      }

      // Push the budget record into the respective category's goals array
      const index = categoryPositions[type][category.budget_category_id];
      result[type].categories[index][1].push(budget);
   }

   return result;
}

export async function createCategory(category: BudgetCategory): Promise<string | "conflict"> {
   // Creates a new budget category or returns a conflict if the category already exists
   try {
      const creation = `
         INSERT INTO budget_categories (user_id, type, name, category_order)
         VALUES ($1, $2, $3, $4)
         RETURNING budget_category_id;
      `;
      const result = await query(
         creation,
         [category.user_id, category.type, category.name, category.category_order]
      ) as { budget_category_id: string }[];

      return result[0].budget_category_id;
   } catch (error) {
      // Check if error is a unique constraint violation
      if (error instanceof Error && error.message.includes("unique constraint")) {
         return "conflict";
      }

      // Unexpected error
      throw error;
   }
}

export async function updateCategory(user_id: string, updates: Partial<BudgetCategory>): Promise<boolean> {
   // Dynamically builds an update query based on the provided updates
   const fields: string[] = [];
   const values: any[] = [];
   let params = FIRST_PARAM;

   // Only include fields that are present in the updates
   ["name", "type", "category_order"].forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${params}`);
         values.push(updates[field as keyof BudgetCategory]);
         params++;
      }
   });

   // Skip query if no fields to update
   if (fields.length === 0) return true;

   // Add user ID and category ID to the values array for a proper update
   values.push(user_id, updates.budget_category_id);

   const updateQuery = `
      UPDATE budget_categories
      SET ${fields.join(", ")}
      WHERE user_id = $${params}
      AND budget_category_id = $${params + 1}
      RETURNING budget_category_id;
   `;
   const result = await query(updateQuery, values) as { budget_category_id: string }[];

   return result.length > 0;
}

export async function deleteCategory(user_id: string, budget_category_id: string): Promise<boolean> {
   // Deletes a budget category, which will also delete all associated budgets (CASCADE)
   const removal = `
      DELETE FROM budget_categories
      WHERE user_id = $1
      AND budget_category_id = $2
      RETURNING budget_category_id;
   `;
   const result = await query(removal, [user_id, budget_category_id]) as { budget_category_id: string }[];

   return result.length > 0;
}

export async function updateCategoryOrderings(user_id: string, updates: Partial<BudgetCategory>[]): Promise<boolean> {
   // Skip processing if no updates provided
   if (updates.length === 0) return true;

   // Bulk update category ordering in a single query
   const values = updates.map((_, index) => `($${(index * 2) + 1}, $${(index * 2) + 2})`).join(", ");
   const params = updates.flatMap(update => [
      String(update.budget_category_id),
      Number(update.category_order)
   ]);

   const update = `
      UPDATE budget_categories
      SET category_order = v.category_order::int
      FROM (VALUES ${values}) AS v(budget_category_id, category_order)
      WHERE budget_categories.budget_category_id = v.budget_category_id::uuid
      AND budget_categories.user_id = $${params.length + 1}
      RETURNING budget_categories.user_id;
   `;
   const result = await query(update, [...params, user_id]) as { user_id: string }[];

   return result.length > 0;
}

export async function createBudget(budget: Budget): Promise<boolean> {
   // Creates a new budget (main or category)
   const creation = `
      INSERT INTO budgets (user_id, budget_category_id, type, goal, year, month)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id;
   `;

   const result = await query(
      creation,
      [budget.user_id, budget.budget_category_id || null, budget.type, budget.goal, budget.year, budget.month]
   ) as { user_id: string }[];

   return result.length > 0;
}

export async function updateBudgetGoal(updates: Budget): Promise<boolean> {
   // Updates a budget goal (main or category)
   const updateQuery = `
      UPDATE budgets
      SET goal = $1
      WHERE user_id = $2
      AND type = $3
      AND year = $4
      AND month = $5
      AND budget_category_id ${updates.budget_category_id ? "= $6" : "IS NULL"}
      RETURNING user_id;
   `;

   const params = [updates.goal, updates.user_id, updates.type, updates.year, updates.month];

   if (updates.budget_category_id) {
      // Updating a category budget goal
      params.push(updates.budget_category_id);
   }

   const result = await query(updateQuery, params) as { user_id: string }[];

   return result.length > 0;
}

export async function deleteBudget(budget: Budget): Promise<boolean> {
   // Deletes a budget (main or category)
   const removal = `
      DELETE FROM budgets
      WHERE user_id = $1
      AND type = $2
      AND year = $3
      AND month = $4
      AND budget_category_id ${budget.budget_category_id ? "= $5" : "IS NULL"}
      RETURNING user_id;
  `;

   const params = [budget.user_id, budget.type, budget.year, budget.month];
   if (budget.budget_category_id) {
      params.push(budget.budget_category_id);
   }

   const result = await query(removal, params) as { user_id: string }[];

   return result.length > 0;
}