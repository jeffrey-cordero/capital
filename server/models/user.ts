import { z } from "zod";
import { hash, runQuery } from "@/database/query";

const userSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters"),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(30, "Name must be at most 30 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  email: z
    .string()
    .email("Invalid email address"),
});

export class User {
  id: number | null;
  username: string;
  name: string;
  password: string;
  email: string;
  verified: boolean;

  constructor(id: number | null, username: string, name: string, password: string, email: string, verified: boolean) {
    this.id = id;
    this.username = username;
    this.name = name; 
    this.password = password;
    this.email = email;
    this.verified = verified;
  }

  // Find other users by their unique fields, which requires normalized parameters
  static async fetchExistingUsers(username: string, email: string): Promise<User[]> {
    const conflicts = "SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) OR LOWER(TRIM(email)) = LOWER(TRIM(?))";
    const parameters = [username, email];

    return (await runQuery(conflicts, parameters)) as User[];
  }

  // Authenticate user by username and password
  static async authenticate(username: string, password: string): Promise<User | null> {
    const search = "SELECT * FROM users WHERE username = ?;";
    const parameters = [username];

    const result = (await runQuery(search, parameters)) as User[];

    if (result.length > 0) {
      const user = result[0];

      // Check if password matches
      if (user.password === hash(password)) {
        return user;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  
  // Validate user fields
  validate(): { [key: string]: string } | null {
    const fields = userSchema.safeParse(this);

    if (!fields.success) {
      // Convert error object to single error messages per field
      const errors = fields.error.flatten().fieldErrors;

      const singleErrorMessages: Record<string, string> = Object.fromEntries(
        Object.entries(errors).map(([field, errors]) => [
          field,
          errors?.[0] || "Unknown error",
        ])
      );

      return singleErrorMessages;
    }

    return null;
  }

  // Create new user
  async create(): Promise<void> {
    // Normalize sensitive fields
    this.password = hash(this.password);

    const creation = "INSERT INTO users (username, name, password, email, verified) VALUES (?, ?, ?, ?, ?);";
    const parameters = [this.username, this.name, this.password, this.email, false];

    const user = (await runQuery(creation, parameters)) as any;

    // Set user id and remove hashed password
    this.id = user.insertId;
    this.password = "*".repeat(this.password.length);
  }
}
