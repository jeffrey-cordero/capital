import { User } from "capital/user";

import { query } from "@/lib/database/client";

export async function findConflictingUsers(username: string, email: string): Promise<User[]> {
   // Return potential conflicts for username and email
   const conflicts = `
      SELECT * FROM users 
      WHERE username_normalized = $1 OR email_normalized = $2;
   `;
   const normalizedUsername = username.toLowerCase().trim();
   const normalizedEmail = email.toLowerCase().trim();

   return await query(conflicts, [normalizedUsername, normalizedEmail]) as User[];
}

export async function findById(id: string): Promise<User[]> {
   // Return user by their unique ID
   const search = `
      SELECT * FROM users 
      WHERE id = $1;
   `;

   return await query(search, [id]) as User[];
}

export async function findByUsername(username: string): Promise<User[]> {
   // Return user by their unique username
   const search = `
      SELECT * FROM users 
      WHERE username = $1;
   `;

   return await query(search, [username]) as User[];
}

export async function create(user: User): Promise<User[]> {
   // Create new user with provided fields
   const insert = `
      INSERT INTO users (username, name, password, email) 
      VALUES ($1, $2, $3, $4)
      RETURNING *;
   `;

   return await query(insert, [user.username, user.name, user.password, user.email]) as User[];
}