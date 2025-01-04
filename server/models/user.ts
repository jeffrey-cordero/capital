import cryptoJS from "crypto-js";
import { hash, runQuery } from "@/database/query";
import { z } from "zod";

const userSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters"),
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

  // Validate user data
  validate(): { [key: string]: string } | null {
    const fields = userSchema.safeParse({
      username: this.username,
      name: this.name,
      password: this.password,
      email: this.email,
    });

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

  // Find other users by unique fields
  static async findUserConstraints(
    username: string,
    email: string
  ): Promise<User[]> {
    const conflicts = "SELECT * FROM users WHERE username = ? OR  email = ?;";
    const parameters = [username, email];

    return (await runQuery(conflicts, parameters)) as User[];
  }

  // Create new user
  async create(): Promise<void> {
    // Hash password before storing
    this.password = hash(this.password);

    const creation = "INSERT INTO users (username, name, password, email, verified) VALUES (?, ?, ?, ?, ?);";
    const parameters = [this.username, this.name, this.password, this.email, false];

    const user = (await runQuery(creation, parameters)) as any;

    // Set user id and remove hashed password
    this.id = user.insertId;
    this.password = "*".repeat(this.password.length);
  }

  // Update user data
  async update(): Promise<void> {
    // Implement database update...
    console.log(
      `Updating user: ${this.id}, Name: ${this.username}, Email: ${this.email}`
    );
  }
}
