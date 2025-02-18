import { User } from "capital-types/user";

import { runQuery } from "@/lib/database/client";
import { compare, hash } from "@/lib/database/cryptography";

export async function getConflictingUsers(username: string, email: string): Promise<Record<string, string> | null> {
   // Return errors if user exists with same username and/or email, otherwise return is null
   const normalizedUsername = username.toLowerCase().trim();
   const normalizedEmail = email.toLowerCase().trim();

   const conflicts = `
      SELECT * FROM users 
      WHERE username_normalized = ? 
      OR email_normalized = ?;
   `;
   const result = await runQuery(conflicts, [username, email]) as User[];

   if (result.length > 0) {
      // User exists with same username and/or email
      const errors = result.reduce((account, user) => {
         if (user.username.toLowerCase().trim() === normalizedUsername) {
            account.username = "Username already exists";
         }

         if (user.email.toLowerCase().trim() === normalizedEmail) {
            account.email = "Email already exists";
         }

         return account;
      }, {} as Record<string, string>);

      return errors;
   } else {
      return null;
   }
}

export async function getById(id: number): Promise<User | null> {
   // Find user by their unique ID
   const search = `
      SELECT * FROM users 
      WHERE id = ?;
   `;
   const result = await runQuery(search, [id]) as User[];

   return result.length > 0 ? result[0] : null;
}

export async function authenticate(username: string, password: string): Promise<User | null> {
   const search = `
      SELECT * FROM users 
      WHERE username = ?;
   `;
   const result = await runQuery(search, [username]) as User[];

   return result.length > 0 ? await compare(password, result[0].password) ? result[0] : null : null;
}

export async function create(user: User): Promise<User> {
   // Create new user with hashed password and unverified status
   const fields = { ...user, password: await hash(user.password), verified: false };
   const creation = `
      INSERT INTO users (user_id, username, name, password, email, verified) 
      VALUES (UUID(), ?, ?, ?, ?, ?);
   `;
   await runQuery(creation, [fields.username, fields.name, fields.password, fields.email, fields.verified]);

   // Fetch the user ID for expected response
   const insertion = `
      SELECT user_id 
      FROM users 
      WHERE username = ?;
   `;
   const result = await runQuery(insertion, [fields.username]) as { user_id: string }[];
   fields.id = result[0].user_id;

   return fields;
}