import {
   Budget,
   BudgetCategory,
   BudgetGoal,
   BudgetType,
   OrganizedBudgets
} from "capital/budgets";
import { PoolClient } from "pg";

import { FIRST_PARAM, query, transaction } from "@/lib/database";

/**
 * Updatable budget category fields
 */
const BUDGET_CATEGORY_UPDATES = ["name", "type", "category_order"] as const;

/**
 * Fetches budgets with categories for a user
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<OrganizedBudgets>} Organized budget data
 */
export async function findByUserId(user_id: string): Promise<OrganizedBudgets> {
   // Fetch all budgets for a user with categories in a single query
   const overall = `
      SELECT bc.budget_category_id, bc.name, bc.type, bc.category_order, b.goal, b.year, b.month
      FROM budget_categories AS bc
      INNER JOIN budgets AS b
      ON b.budget_category_id = bc.budget_category_id
      WHERE bc.user_id = $1
      ORDER BY bc.type DESC, bc.category_order ASC NULLS FIRST, b.year DESC, b.month DESC;
   `;
   const results = await query(overall, [user_id]);

   // Initialize organized structure with Income and Expenses sections
   const categories: Record<string, number> = {};
   const result: OrganizedBudgets = {
      Income: { goals: [], goalIndex: 0, budget_category_id: "", categories: [] },
      Expenses: { goals: [], goalIndex: 0, budget_category_id: "", categories: [] }
   };

   for (const row of results) {
      const type: BudgetType = row.type;

      // Extract the budget category data
      const category: BudgetCategory = {
         budget_category_id: row.budget_category_id,
         type: row.type,
         name: row.name,
         category_order: row.category_order,
         goalIndex: 0,
         goals: []
      };

      // Extract the budget data
      const budget: BudgetGoal = {
         goal: row.goal,
         year: row.year,
         month: row.month
      };

      // Handle the main budget category (Income/Expenses)
      if (!category.name) {
         result[type].goals.push(budget);
         result[type].budget_category_id = row.budget_category_id;

         continue;
      }

      // Check if the budget category already exists in our map
      const categoryIndex: number | undefined = categories[row.budget_category_id];

      if (categoryIndex === undefined) {
         // New budget category, thus we add it to the result and track its position
         const index: number = result[type].categories.length;

         result[type].categories.push({ ...category, goals: [budget] });
         categories[row.budget_category_id] = index;
      } else {
         // Existing budget category, thus we append the budget to the goals
         result[type].categories[categoryIndex].goals.push(budget);
      }
   }

   return result;
}

/**
 * Creates a budget category with initial budget goal
 *
 * @param {string} user_id - User identifier
 * @param {Omit<Budget & BudgetCategory, "budget_category_id">} category - Category details
 * @param {PoolClient} [externalClient] - Optional client for transactions
 * @returns {Promise<string>} Created category ID
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
      const result = await client.query(creation, [
         user_id,
         category.type,
         category.name,
         category.category_order
      ]);

      // Create the initial budget record for the newly created budget category
      const budget_category_id: string = result.rows[0].budget_category_id;
      const budget = `
         INSERT INTO budgets (budget_category_id, goal, year, month)
         VALUES ($1, $2, $3, $4);
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
 * Updates a budget category
 *
 * @param {string} user_id - User identifier
 * @param {string} budget_category_id - Category identifier
 * @param {Partial<BudgetCategory>} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateCategory(
   user_id: string,
   budget_category_id: string,
   updates: Partial<BudgetCategory>
): Promise<boolean> {
   // Dynamically builds an update query based on the provided updates
   let param: number = FIRST_PARAM;
   const fields: string[] = [];
   const values: any[] = [];

   // Only include fields that are present in the updates
   BUDGET_CATEGORY_UPDATES.forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${param}`);
         values.push(updates[field as keyof BudgetCategory]);
         param++;
      }
   });

   // Skip query if there are no fields to update
   if (fields.length === 0) return true;

   // Append the user ID and budget category ID
   values.push(user_id, budget_category_id);
   param++;

   const update = `
      UPDATE budget_categories
      SET ${fields.join(", ")}
      WHERE user_id = $${param - 1}
      AND budget_category_id = $${param}
      RETURNING budget_category_id;
   `;

   try {
      const result = await query(update, values);

      return result.length > 0;
   } catch (error: any) {
      // Catch main category conflicts, where updates are forbidden for data integrity
      if (error.message.includes("Main budget category can't be updated")) {
         return false;
      }

      // Unexpected error
      throw error;
   }
}

/**
 * Deletes a budget category
 *
 * @param {string} user_id - User identifier
 * @param {string} budget_category_id - Category identifier
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCategory(user_id: string, budget_category_id: string): Promise<boolean> {
   const removal = `
      DELETE FROM budget_categories
      WHERE user_id = $1
      AND budget_category_id = $2
      RETURNING budget_category_id;
   `;
   const result = await query(removal, [user_id, budget_category_id]);

   return result.length > 0;
}

/**
 * Updates budget category ordering
 *
 * @param {string} user_id - User identifier
 * @param {Partial<BudgetCategory>[]} updates - Category order updates
 * @returns {Promise<boolean>} Success status
 */
export async function updateCategoryOrderings(user_id: string, updates: Partial<BudgetCategory>[]): Promise<boolean> {
   // Bulk update category ordering formatting
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
   const result = await query(update, [...params, user_id]);

   return result.length > 0;
}

/**
 * Verifies if a budget category belongs to a user
 *
 * @param {PoolClient} client - Database transaction client
 * @param {string} user_id - User identifier
 * @param {string} budget_category_id - Category identifier
 * @returns {Promise<boolean>} Ownership verification result
 */
async function verifyCategoryOwnership(client: PoolClient, user_id: string, budget_category_id: string): Promise<boolean> {
   const query = `
      SELECT 1
      FROM budget_categories
      WHERE user_id = $1
      AND budget_category_id = $2;
   `;
   const result = await client.query(query, [user_id, budget_category_id]);

   return result.rows.length > 0;
}

/**
 * Creates a new budget
 *
 * @param {string} user_id - User identifier
 * @param {Budget} budget - Budget details
 * @returns {Promise<"created" | "failure">} Creation result
 */
export async function createBudget(user_id: string, budget: Budget): Promise<"created" | "failure"> {
   return await transaction(async(client: PoolClient): Promise<"created" | "failure"> => {
      // Verify that the budget category belongs to the user
      if (!verifyCategoryOwnership(client, user_id, budget.budget_category_id)) {
         return "failure";
      }

      // Create the budget record
      const creation = `
         INSERT INTO budgets (budget_category_id, goal, year, month)
         VALUES ($1, $2, $3, $4)
         RETURNING budget_category_id;
      `;
      const result = await client.query(creation, [
         budget.budget_category_id,
         budget.goal,
         budget.year,
         budget.month
      ]);

      return result.rows.length > 0 ? "created" : "failure";
   }) as "created" | "failure";
}

/**
 * Updates a budget goal
 *
 * @param {string} user_id - User identifier
 * @param {string} budget_category_id - Category identifier
 * @param {Budget} updates - Budget details to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateBudget(user_id: string, budget_category_id: string, updates: Budget): Promise<boolean> {
   return await transaction(async(client: PoolClient): Promise<boolean> => {
      // Verify that the budget category belongs to the user
      if (!verifyCategoryOwnership(client, user_id, budget_category_id)) {
         return false;
      }

      // Update the budget record
      const update = `
         UPDATE budgets
         SET goal = $1
         WHERE budget_category_id = $2
         AND year = $3
         AND month = $4
         RETURNING budget_category_id;
      `;
      const result = await client.query(update, [
         updates.goal,
         updates.budget_category_id,
         updates.year,
         updates.month
      ]);

      return result.rows.length > 0;
   }) as boolean;
}