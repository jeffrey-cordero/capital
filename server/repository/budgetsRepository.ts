import { Budget, BudgetCategory, BudgetType, OrganizedBudgets } from "capital/budgets";
import { PoolClient } from "pg";

import { FIRST_PARAM, query, transaction } from "@/lib/database";

/**
 * The fields that can be updated for a budget category
 */
const BUDGET_CATEGORY_UPDATES = ["name", "type", "category_order"] as const;

/**
 * Fetches all budgets for a user
 *
 * @param {string} user_id - The user ID
 * @returns {Promise<OrganizedBudgets>} The organized budgets
 * @description
 * - Fetches all budgets for a user with categories and their respective budget goals
 * - Returns the organized budgets
 */
export async function findByUserId(user_id: string): Promise<OrganizedBudgets> {
   // Fetch all budgets for a user with categories in a single efficient query
   const overall = `
      SELECT b.*, bc.*
      FROM budget_categories AS bc
      INNER JOIN budgets AS b
      ON b.budget_category_id = bc.budget_category_id
      WHERE bc.user_id = $1
      ORDER BY bc.type DESC, bc.category_order ASC NULLS FIRST, b.year DESC, b.month DESC;
   `;
   const results = await query(overall, [user_id]) as (Budget & BudgetCategory)[];

   // Initialize organized structure with Income and Expenses sections
   const today = new Date(new Date().setHours(0, 0, 0, 0));
   const result: OrganizedBudgets = {
      Income: { goals: [], goalIndex: 0, budget_category_id: "", categories: [] },
      Expenses: { goals: [], goalIndex: 0, budget_category_id: "", categories: [] },
      period: {
         month: today.getUTCMonth() + 1,
         year: today.getUTCFullYear()
      }
   };
   const categoriesMap: Record<string, number> = {};

   // Process each row from the joined query
   for (const row of results) {
      const type: BudgetType = row.type;

      // Extract category data
      const category: BudgetCategory = {
         budget_category_id: row.budget_category_id,
         type: row.type,
         name: row.name,
         category_order: row.category_order,
         goalIndex: 0,
         goals: []
      };

      // Extract budget data
      const budget: Omit<Budget, "budget_category_id"> = {
         goal: row.goal,
         year: row.year,
         month: row.month
      };

      // Handle main budget category (Income or Expenses)
      if (!category.name) {
         result[type].goals.push(budget);
         result[type].budget_category_id = row.budget_category_id;
         continue;
      }

      // Check if category already exists in our result
      const categoryIndex = categoriesMap[row.budget_category_id];

      if (categoryIndex === undefined) {
         // New category - add to result and track position
         const index = result[type].categories.length;

         result[type].categories.push({ ...category, goals: [budget] });
         categoriesMap[row.budget_category_id] = index;
      } else {
         // Existing category - append budget to goals
         result[type].categories[categoryIndex].goals.push(budget);
      }
   }

   return result;
}

/**
 * Creates a new budget category and initial budget goal record
 *
 * @param {string} user_id - The user ID
 * @param {Omit<Budget & BudgetCategory, "budget_category_id">} category - The budget category
 * @param {PoolClient} externalClient - The optional external client, which is used for nested transactions
 * @returns {Promise<string>} The budget category ID
 * @description
 * - Creates a new budget category
 * - Returns the budget category ID
 */
export async function createCategory(
   user_id: string,
   category: Omit<Budget & BudgetCategory, "budget_category_id">,
   externalClient?: PoolClient
): Promise<string> {
   return await transaction(async(internalClient: PoolClient) => {
      // Use provided external client or internal transaction client
      const client: PoolClient = externalClient || internalClient;

      // Create the budget category record
      const creation = `
         INSERT INTO budget_categories (user_id, type, name, category_order)
         VALUES ($1, $2, $3, $4)
         RETURNING budget_category_id;
      `;
      const result = await client.query<{ budget_category_id: string }>(
         creation,
         [user_id, category.type, category.name?.trim(), category.category_order]
      );

      // Create the initial budget record for this category
      const budget_category_id: string = result.rows[0].budget_category_id;
      const budget = `
         INSERT INTO budgets (budget_category_id, goal, year, month)
         VALUES ($1, $2, $3, $4)
      `;

      await client.query(budget, [
         budget_category_id,
         category.goal,
         category.year,
         category.month
      ]);

      return budget_category_id;
   }) as string;
}

/**
 * Updates a budget category, which includes the name, type, and category order
 *
 * @param {Partial<BudgetCategory>} updates - The updates
 * @returns {Promise<"success" | "failure" | "main_category_conflict" | "no_updates">} The result of the update
 * @description
 * - Updates a budget category
 * - "success" is returned if the update was successful, "failure" if the update failed, "main_category_conflict" if the main category cannot be updated, and "no_updates" if no updates were provided
 */
export async function updateCategory(
   updates: Partial<BudgetCategory>
): Promise<"success" | "failure" | "main_category_conflict" | "no_updates"> {
   // Dynamically builds an update query based on the provided updates
   const fields: string[] = [];
   const values: any[] = [];
   let params = FIRST_PARAM;

   // Only include fields that are present in the updates
   BUDGET_CATEGORY_UPDATES.forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${params}`);
         values.push(updates[field as keyof BudgetCategory]);
         params++;

         // Trim string fields (except category_order which is numeric)
         if (field !== "category_order") {
            values[values.length - 1] = String(values[values.length - 1])?.trim();
         }
      }
   });

   // Skip query if no fields to update
   if (fields.length === 0) return "no_updates";

   // Add category ID to the values array for the WHERE clause
   values.push(updates.budget_category_id);

   const updateQuery = `
      UPDATE budget_categories
      SET ${fields.join(", ")}
      WHERE budget_category_id = $${params}
      RETURNING budget_category_id;
   `;

   try {
      const result = await query(updateQuery, values) as { budget_category_id: string }[];
      return result.length > 0 ? "success" : "failure";
   } catch (error: any) {
      // Catch main category conflicts, where changes are forbidden for data integrity
      if (error.message.includes("Main budget category can't be updated")) {
         return "main_category_conflict";
      }

      // Re-throw unexpected errors
      throw error;
   }
}

/**
 * Deletes a budget category
 *
 * @param {string} user_id - The user ID
 * @param {string} budget_category_id - The budget category ID
 * @returns {Promise<boolean>} True if the budget category was deleted, false otherwise
 * @description
 * - Deletes a budget category
 * - Returns true if the budget category was deleted, false otherwise
 */
export async function deleteCategory(user_id: string, budget_category_id: string): Promise<boolean> {
   const removal = `
      DELETE FROM budget_categories
      WHERE user_id = $1
      AND budget_category_id = $2
      RETURNING budget_category_id;
   `;
   const result = await query(removal, [user_id, budget_category_id]) as { budget_category_id: string }[];

   return result.length > 0;
}

/**
 * Updates the ordering of budget categories
 *
 * @param {string} user_id - The user ID
 * @param {Partial<BudgetCategory>[]} updates - The updates
 * @returns {Promise<boolean>} True if the ordering was updated, false otherwise
 * @description
 * - Updates the ordering of budget categories
 * - Returns true if the ordering was updated, false otherwise
 */
export async function updateCategoryOrderings(user_id: string, updates: Partial<BudgetCategory>[]): Promise<boolean> {
   // Skip processing if no updates provided
   if (!Array.isArray(updates) || updates.length === 0) return true;

   // Bulk update category ordering in a single efficient query
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

/**
 * Creates a new budget
 *
 * @param {Budget} budget - The budget
 * @returns {Promise<"created" | "updated" | "failure">} The result of the creation or update
 * @description
 * - Creates a new budget
 * - "created" is returned if the budget was created, and "failure" if the creation failed
 */
export async function createBudget(budget: Budget): Promise<"created" | "failure"> {
   // Creates a new budget or updates existing one
   const creation = `
      INSERT INTO budgets (budget_category_id, goal, year, month)
      VALUES ($1, $2, $3, $4)
      RETURNING budget_category_id;
   `;
   const result = await query(creation,
      [budget.budget_category_id, budget.goal, budget.year, budget.month]
   ) as { budget_category_id: string }[];

   return result.length > 0 ? "created" : "failure";
}

/**
 * Updates a budget, which includes the goal
 *
 * @param {Budget} updates - The updates
 * @returns {Promise<boolean>} True if the budget was updated, false otherwise
 * @description
 * - Updates a budget, which includes the goal
 * - Returns true if the budget was updated, false otherwise
 */
export async function updateBudget(updates: Budget): Promise<boolean> {
   const updateQuery = `
      UPDATE budgets
      SET goal = $1
      WHERE budget_category_id = $2
      AND year = $3
      AND month = $4
      RETURNING budgets.budget_category_id;
   `;

   const result = await query(updateQuery,
      [updates.goal, updates.budget_category_id, updates.year, updates.month]
   ) as { budget_category_id: string }[];

   return result.length > 0;
}