import { User, UserDetails, UserUpdates } from "capital/user";
import { PoolClient } from "pg";

import { FIRST_PARAM, query, transaction } from "@/lib/database";
import { createCategory } from "@/repository/budgetsRepository";

/**
 * Updatable user fields
 */
const USER_UPDATES = ["username", "name", "password", "email", "birthday"] as const;

/**
 * Finds potentially conflicting users
 *
 * @param {string} username - Username to check
 * @param {string} email - Email to check
 * @param {string} [user_id] - User ID to exclude from check
 * @returns {Promise<User[]>} Matching users
 */
export async function findConflictingUsers(username: string, email: string, user_id?: string): Promise<User[]> {
   // Conflicts based on existing username and/or email
   const conflicts = `
      SELECT user_id, username, email
      FROM users
      WHERE (username_normalized = $1 OR email_normalized = $2) AND (user_id IS DISTINCT FROM $3);
   `;
   const usernameNormalized = username.toLowerCase().trim();
   const emailNormalized = email.toLowerCase().trim();

   return await query(conflicts, [usernameNormalized, emailNormalized, user_id]);
}

/**
 * Finds user by username
 *
 * @param {string} username - Username to find
 * @returns {Promise<User | null>} Matching user or null
 */
export async function findByUsername(username: string): Promise<User | null> {
   // Find user by their unique username
   const search = `
      SELECT user_id, username, password
      FROM users
      WHERE username = $1;
   `;
   const result = await query(search, [username]);

   return result.length > 0 ? result[0] : null;
}

/**
 * Finds user by ID
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<User | null>} Matching user or null
 */
export async function findByUserId(user_id: string): Promise<User | null> {
   // Find user by their unique user ID
   const search = `
      SELECT * FROM users
      WHERE user_id = $1;
   `;
   const result: User[] = await query(search, [user_id]);

   return result.length > 0 ? result[0] : null;
}

/**
 * Creates a new user with initial budget categories
 *
 * @param {User} user - User details
 * @returns {Promise<string>} Created user ID
 */
export async function create(user: User): Promise<string> {
   return await transaction(async(client: PoolClient) => {
      // Create the new user with provided fields
      const creation = `
         INSERT INTO users (username, name, password, email, birthday)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id;
      `;
      const result = await client.query(creation, [
         user.username,
         user.name,
         user.password,
         user.email,
         user.birthday
      ]);

      // Insert the main Income and Expenses budget categories
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      const month = today.getUTCMonth() + 1;
      const year = today.getUTCFullYear();

      await createCategory(result.rows[0].user_id, {
         type: "Income",
         name: null,
         category_order: null,
         goal: 2000,
         month: month,
         year: year,
         goalIndex: 0,
         goals: []
      }, client);

      await createCategory(result.rows[0].user_id, {
         type: "Expenses",
         name: null,
         category_order: null,
         goal: 2000,
         month: month,
         year: year,
         goalIndex: 0,
         goals: []
      }, client);

      return result.rows[0].user_id;
   }) as string;
}

/**
 * Updates user information
 *
 * @param {string} user_id - User identifier
 * @param {Partial<UserUpdates>} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function update(user_id: string, updates: Partial<UserUpdates>): Promise<boolean> {
   // Build dynamic update query based on provided fields
   let param: number = FIRST_PARAM;
   const fields: string[] = [];
   const values: any[] = [];

   // Only include fields that are present in the updates
   USER_UPDATES.forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${param}`);
         values.push(updates[field as keyof UserDetails]);
         param++;
      }
   });

   // Skip query if no fields to update
   if (fields.length === 0) return true;

   // Append the user ID
   values.push(user_id);

   const update = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE user_id = $${param}
      RETURNING user_id;
   `;
   const result = await query(update, values);

   return result.length > 0;
}

/**
 * Deletes a user and associated data
 *
 * @param {string} user_id - User identifier
 * @returns {Promise<boolean>} Success status
 */
export async function deleteUser(user_id: string): Promise<boolean> {
   return await transaction(async(client: PoolClient): Promise<boolean> => {
      // Disable the main budget category trigger
      await client.query("ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger");

      // Delete the user
      const deletion = `
         DELETE FROM users
         WHERE user_id = $1;
      `;
      const result = await client.query(deletion, [user_id]);

      // Re-enable the main budget category trigger
      await client.query("ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger");

      return result.rowCount === 1;
   }, "SERIALIZABLE") as boolean;
}