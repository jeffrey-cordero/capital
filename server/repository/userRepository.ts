import { User, UserDetails, UserUpdates } from "capital/user";
import { PoolClient } from "pg";

import { FIRST_PARAM, query, transaction } from "@/lib/database";
import { createCategory } from "@/repository/budgetsRepository";

/**
 * The fields that can be updated for a user
 */
const USER_UPDATES = ["username", "name", "password", "email", "birthday"] as const;

/**
 * Finds conflicting users based on username and/or email.
 *
 * @param {string} username - The username
 * @param {string} email - The email
 * @param {string} [user_id] - The potential user ID to exclude from the conflict check
 * @returns {Promise<User[]>} The potential conflicting users
 */
export async function findConflictingUsers(username: string, email: string, user_id?: string): Promise<User[]> {
   // Conflicts based on existing username and/or email
   const conflicts = `
      SELECT * FROM users
      WHERE (username_normalized = $1 OR email_normalized = $2)
      AND (user_id IS DISTINCT FROM $3);
   `;
   const normalizedUsername = username.toLowerCase().trim();
   const normalizedEmail = email.toLowerCase().trim();
   const params = [normalizedUsername, normalizedEmail, user_id];

   return await query(conflicts, params) as User[];
}

/**
 * Finds a user by their unique username.
 *
 * @param {string} username - The username
 * @returns {Promise<User | null>} The potential user
 */
export async function findByUsername(username: string): Promise<User | null> {
   // Find user by their unique username
   const search = `
      SELECT * FROM users
      WHERE username = $1;
   `;
   const result: User[] = await query(search, [username]);

   return result.length > 0 ? result[0] : null;
}

/**
 * Finds a user by their unique user ID.
 *
 * @param {string} user_id - The user ID
 * @returns {Promise<User | null>} The potential user
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
 * Creates a new user with their initial Income and Expenses budget records.
 *
 * @param {User} user - The user to be inserted
 * @returns {Promise<string>} The inserted user ID
 */
export async function create(user: User): Promise<string> {
   return await transaction(async(client: PoolClient) => {
      // Create the new user with provided fields
      const creation = `
         INSERT INTO users (username, name, password, email, birthday)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id;
      `;
      const result = await client.query<{ user_id: string }>(
         creation, [user.username, user.name, user.password, user.email, user.birthday]
      );

      // Create the new user's initial Income and Expenses budgets
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      const month = today.getUTCMonth() + 1;
      const year = today.getUTCFullYear();

      // Create Income and Expenses budget categories with initial budgets
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
 * Updates a user's information.
 *
 * @param {string} user_id - The user ID
 * @param {Partial<UserUpdates>} updates - The updates
 * @returns {Promise<boolean>} True if the user was updated, false otherwise
 */
export async function update(user_id: string, updates: Partial<UserUpdates>): Promise<boolean> {
   // Build dynamic update query based on provided fields
   const fields: string[] = [];
   const values: any[] = [];
   let params = FIRST_PARAM;

   // Only include fields that are present in the updates
   USER_UPDATES.forEach((field: string) => {
      if (field in updates) {
         fields.push(`${field} = $${params}`);
         values.push(updates[field as keyof UserDetails]);
         params++;
      }
   });

   // Skip query if no fields to update
   if (fields.length === 0) return true;

   // Add user ID for WHERE clause
   values.push(user_id);

   const updateQuery = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE user_id = $${params}
      RETURNING user_id;
   `;
   const result = await query(updateQuery, values) as User[];

   return result.length > 0;
}

/**
 * Deletes a user and their associated data.
 *
 * @param {string} user_id - The user ID
 * @returns {Promise<boolean>} True if the user was deleted, false otherwise
 */
export async function deleteUser(user_id: string): Promise<boolean> {
   return await transaction(async(client: PoolClient): Promise<boolean> => {
      // Prevent the main budget category trigger from firing
      await client.query("ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_deletion_trigger");

      const deletion = `
         DELETE FROM users
         WHERE user_id = $1;
      `;
      const result = await client.query(deletion, [user_id]);

      // Re-enable the main budget category trigger for data integrity
      await client.query("ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_deletion_trigger");

      return result.rowCount === 1;
   }, "SERIALIZABLE") as boolean; // SERIALIZABLE to ensure non-interference between transactions
}