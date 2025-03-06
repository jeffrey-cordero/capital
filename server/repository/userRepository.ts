import { User } from "capital/user";

import { query } from "@/lib/database";

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
   // Create the new user with provided fields
   const insert = `
      INSERT INTO users (username, name, password, email) 
      VALUES ($1, $2, $3, $4)
      RETURNING user_id;
   `;
   const result: { user_id: string }[] = await query(
      insert, [user.username, user.name, user.password, user.email]
   );

   return result[0].user_id;
}