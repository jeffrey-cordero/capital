import { hash, runQuery } from "@/lib/database/query";
import { User } from "capital-types/user";

export async function getConflictingUsers(username: string, email: string): Promise<Record<string, string> | null> {
  // Return errors if user exists with same username and/or email, otherwise return is null
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();

  const conflicts = "SELECT * FROM users WHERE username_normalized = ? OR email_normalized = ?;";
  const parameters = [username, email];

  const result = await runQuery(conflicts, parameters) as User[];

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
    console.log("No conflicts found");
    return null;
  }
}

export async function getById(id: number): Promise<User | null> {
  // Find user by their unique ID
  const search = "SELECT * FROM users WHERE id = ?;";
  const parameters = [id];

  const result = await runQuery(search, parameters) as User[];

  return result.length > 0 ? result[0] : null;
}

export async function authenticate(username: string, password: string): Promise<User | null> {
   const search = "SELECT * FROM users WHERE username = ?;";
   const parameters = [username];

   const result = await runQuery(search, parameters) as User[];

   return result.length > 0 ? result[0].password === hash(password) ? result[0] : null : null;
}

export async function create(user: User): Promise<User> {
  // Create new user with hashed password and unverified status
  const fields = { ...user, password: hash(user.password), verified: false };
  const creation = "INSERT INTO users (username, name, password, email, verified) VALUES (?, ?, ?, ?, ?);";
  const parameters = [fields.username, fields.name, hash(fields.password), fields.email, fields.verified];

  const result = await runQuery(creation, parameters) as any;
  fields.id = result.insertId;

  return result;
}