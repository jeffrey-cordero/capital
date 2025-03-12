import { User } from "capital/user";
import { PoolClient } from "pg";

import { query, transaction } from "@/lib/database";
import { createCategory } from "@/repository/budgetRepository";

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

export async function findByUsername(username: string): Promise<User | null> {
   // Find user by their unique username
   const search = `
      SELECT * FROM users 
      WHERE username = $1;
   `;
   const result: User[] = await query(search, [username]);

   return result.length > 0 ? result[0] : null;
}

export async function create(user: User): Promise<string> {
   return await transaction(async(client: PoolClient) => {
      // Create the new user with provided fields
      const creation = `
         INSERT INTO users (username, name, password, email) 
         VALUES ($1, $2, $3, $4)
         RETURNING user_id;
      `;
      const result = await client.query<{ user_id: string }[]>(
         creation, [user.username, user.name, user.password, user.email]
      ) as any;

      // Create the new user's initial Income and Expenses budgets
      const today = new Date();
      const month = today.getUTCMonth() + 1;
      const year = today.getUTCFullYear();

      await createCategory(result.rows[0].user_id, {
         type: "Income",
         name: null,
         category_order: null,
         goal: 2000,
         month: month,
         year: year
      }, client);

      await createCategory(result.rows[0].user_id, {
         type: "Expenses",
         name: null,
         category_order: null,
         goal: 2000,
         month: month,
         year: year
      }, client);

      return result.rows[0].user_id;
   }) as string;
}