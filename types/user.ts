import { z } from "zod";

export const userSchema = z.object({
  user_id: z.string().trim().uuid().nullable().optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(30, "Name must be at most 30 characters"),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters long")
    .max(255, {
      message: "Password must be at most 255 characters long"
    })
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  verifyPassword: z
    .string()
    .trim(),
  email: z
    .string()
    .trim()
    .max(255, {
      message: "Email must be at most 255 characters long"
    })
    .email("Invalid email address"),
  verified: z.boolean().default(false)
}).strict();

export type User = z.infer<typeof userSchema>;