import { Budget, BudgetCategory, BudgetType, OrganizedBudgets } from "capital/budgets";
import { PoolClient } from "pg";

import { FIRST_PARAM, query, transaction } from "@/lib/database";

export async function findByUserId(user_id: string): Promise<OrganizedBudgets> {
   // Retrieves all budgets for a user organized by type, year, month, and category
   const overall = `
      SELECT b.*, bc.*
      FROM budgets AS b
      LEFT JOIN budget_categories AS bc 
      ON b.budget_category_id = bc.budget_category_id
      WHERE b.user_id = $1
      ORDER BY b.year DESC, b.month DESC, 
      CASE WHEN b.budget_category_id IS NULL THEN 0 ELSE 1 END,
      b.type, 
      bc.category_order ASC NULLS FIRST;
   `;
   const results = await query(overall, [user_id]) as (Budget & BudgetCategory)[];

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

   // Process each row from the joined query
   for (const row of results) {
      const type: BudgetType = row.type;

      // Extract budget data from the row
      const budget: Budget = {
         user_id: row.user_id,
         budget_category_id: row.budget_category_id,
         type: row.type,
         goal: row.goal,
         year: row.year,
         month: row.month
      };

      // Handle main budget (Income or Expenses) goals
      if (!budget.budget_category_id) {
         result[type].goals.push(budget);

         continue;
      }

      // Extract category data from the row
      const category: BudgetCategory = {
         budget_category_id: row.budget_category_id,
         user_id: row.user_id,
         type: row.type,
         name: row.name,
         category_order: row.category_order
      };

      // Check if we've already processed this category
      const categoryIndex = categoryPositions[type][row.budget_category_id];

      if (categoryIndex === undefined) {
         // New category found, add it to the categories array and track its position
         categoryPositions[type][row.budget_category_id] = result[type].categories.length;
         result[type].categories.push([category, [budget]]);
      } else {
         // Category already exists, just add the budget to it
         result[type].categories[categoryIndex][1].push(budget);
      }
   }

   return result;
}

export async function createCategory(category: Budget & BudgetCategory): Promise<string | "conflict"> {
   // Creates a new budget category or returns a conflict if the category already exists
   try {
      return await transaction(async(client: PoolClient) => {
         // Create the budget category record
         const creation = `
            INSERT INTO budget_categories (user_id, type, name, category_order)
            VALUES ($1, $2, $3, $4)
            RETURNING budget_category_id;
         `;
         const result = await client.query<{ budget_category_id: string }[]>(
            creation,
            [category.user_id, category.type, category.name, category.category_order]
         ) as any;

         // Create the budget record
         const budgetCategoryId: string = result.rows[0].budget_category_id;
         const budget = `
            INSERT INTO budgets (user_id, budget_category_id, type, goal, year, month)
            VALUES ($1, $2, $3, $4, $5, $6)
         `;

         await client.query(budget, [
            category.user_id,
            budgetCategoryId,
            category.type,
            category.goal,
            category.year,
            category.month
         ]);

         return budgetCategoryId;
      }) as string;
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

   const result = await query(creation,
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
   // Deletes a category budget
   const removal = `
      DELETE FROM budgets
      WHERE user_id = $1
      AND type = $2
      AND year = $3
      AND month = $4
      AND budget_category_id = $5
      RETURNING user_id;
  `;
   const result = await query(removal,
      [budget.user_id, budget.type, budget.year, budget.month, budget.budget_category_id]
   ) as { user_id: string }[];

   return result.length > 0;
}