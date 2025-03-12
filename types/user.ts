import { z } from "zod";

export const userSchema = z.object({
  user_id: z.string().nonempty().uuid().nullable().optional(),
  username: z
    .string()
    .nonempty()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  name: z
    .string()
    .nonempty()
    .min(3, "Name must be at least 3 characters")
    .max(30, "Name must be at most 30 characters"),
  password: z
    .string()
    .nonempty()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  verifyPassword: z
    .string()
    .nonempty(),
  email: z
    .string()
    .nonempty()
    .email("Invalid email address"),
  verified: z.boolean().default(false)
}).strict();

export type User = z.infer<typeof userSchema>;