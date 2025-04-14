import { z } from "zod";

/**
 * Common validation constants
 */
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;

/**
 * Represents a user schema
 */
export const userSchema = z.object({
  user_id: z.string().trim().uuid({
    message: "User ID must be a valid UUID"
  }).nullable().optional(),
  username: z
    .string()
    .trim()
    .min(MIN_USERNAME_LENGTH, `Username must be at least ${MIN_USERNAME_LENGTH} characters`)
    .max(MAX_USERNAME_LENGTH, `Username must be at most ${MAX_USERNAME_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  name: z
    .string()
    .trim()
    .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters`)
    .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`),
  birthday: z.coerce.date({
    message: "Birthday must be a valid date"
  }).min(new Date("1800-01-01"), {
    message: "Birthday must be at least 1800-01-01"
  }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
    message: "Birthday cannot be in the future"
  }).transform((date) => date.toISOString()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters long`)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  verifyPassword: z.string(),
  email: z
    .string()
    .max(MAX_EMAIL_LENGTH, `Email must be at most ${MAX_EMAIL_LENGTH} characters long`)
    .email("Invalid email address")
}).strict().refine(data => data.password === data.verifyPassword, {
  message: "Passwords do not match",
  path: ["verifyPassword"]
});

/**
 * Represents core user information
 */
export type User = Omit<z.infer<typeof userSchema>, "verifyPassword">;

/**
 * Represents the inner user schema with no refine methods for the following update schema
 */
const innerUserSchema = userSchema.innerType();

/**
 * Represents a user update schema to account for password updates
 */
export const userUpdateSchema = innerUserSchema.partial().extend({
  newPassword: innerUserSchema.shape.password.optional(),
}).superRefine((data, ctx) => {
  const { password, newPassword, verifyPassword } = data;

  // Check if the user is attempting to change the password
  const isAttemptingPasswordChange = password || newPassword || verifyPassword;

  if (isAttemptingPasswordChange) {
    // If *any* password field is given, *all* are required
    if (!password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to set a new password",
        path: ["password"],
      });
    } else if (!newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password is required to set a new password",
        path: ["newPassword"],
      });
    } else if (!verifyPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password verification is required to set a new password",
        path: ["verifyPassword"],
      });
    }

    if (password === newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password must not match the old password",
        path: ["newPassword"],
      });
    }

    // New password must match the verification field
    if (newPassword !== verifyPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["verifyPassword"],
      });
    }
  }
});

/**
 * Represents core user information for displaying details
 */
export type UserDetails = Omit<User, "user_id" | "password">;

/**
 * Represents core user information for updating details
 */
export type UserDetailUpdates = Omit<z.infer<typeof userUpdateSchema>, "user_id">;