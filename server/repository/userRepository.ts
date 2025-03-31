import { User } from "capital/user";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";
import { createCategory } from "@/repository/budgetsRepository";

/**
 * Finds conflicting users based on username and/or email.
 *
 * @param {string} username - The username
 * @param {string} email - The email
 * @returns {Promise<User[]>} The potential conflicting users
 */
export async function findConflictingUsers(username: string, email: string): Promise<User[]> {
   // Conflicts based on existing username and/or email
   const conflicts = `
      SELECT * FROM users 
      WHERE username_normalized = $1 
      OR email_normalized = $2;
   `;
   const normalizedUsername = username.toLowerCase().trim();
   const normalizedEmail = email.toLowerCase().trim();

   return await query(conflicts, [normalizedUsername, normalizedEmail]) as User[];
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
 * Creates a new user with their initial Income and Expenses budget records.
 *
 * @param {User} user - The user to be inserted
 * @returns {Promise<string>} The inserted user ID
 */
export async function create(user: User): Promise<string> {
   return await transaction(async(client: PoolClient) => {
      // Create the new user with provided fields
      const creation = `
         INSERT INTO users (username, name, password, email)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id;
      `;
      const result = await client.query<{ user_id: string }>(
         creation, [user.username, user.name, user.password, user.email]
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