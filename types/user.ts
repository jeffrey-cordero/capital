import { z } from "zod";

export const userSchema = z.object({
   username: z
     .string()
     .min(3, "Username must be at least 3 characters")
     .max(30, "Username must be at most 30 characters")
     .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
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

export type User = {
  id: number | null;
  username: string;
  name: string;
  password: string;
  verifyPassword?: string;
  email: string;
  verified: boolean
}