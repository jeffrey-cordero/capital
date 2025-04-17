import { z } from "zod";

/**
 * Password validation rules for security compliance
 */
const passwordSchema = z.string().min(8, {
  message: "Password must be at least 8 characters long"
}).max(255, {
  message: "Password must be at most 255 characters long"
}).regex(/[A-Z]/, {
  message: "Password must contain at least one uppercase letter"
}).regex(/[a-z]/, {
  message: "Password must contain at least one lowercase letter"
}).regex(/[0-9]/, {
  message: "Password must contain at least one number"
});

/**
 * Schema for user validation
 *
 * @see {@link User} - Type inferred from this schema
 */
export const userSchema = z.object({
  /* Unique user identifier */
  user_id: z.string().trim().uuid({
    message: "User ID must be a valid UUID"
  }).nullable().optional(),

  /* Unique username */
  username: z.string().trim().min(3, {
    message: "Username must be at least 3 characters"
  }).max(30, {
    message: "Username must be at most 30 characters"
  }).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Username may only contain letters, numbers, underscores, and hyphens"
  }),

  /* Full name */
  name: z.string().trim().min(3, {
    message: "Name must be at least 3 characters"
  }).max(30, {
    message: "Name must be at most 30 characters"
  }),

  /* Birthdate */
  birthday: z.coerce.date({
    message: "Birthday must be a valid date"
  }).min(new Date("1800-01-01"), {
    message: "Birthday must be on or after 1800-01-01"
  }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
    message: "Birthday cannot be in the future"
  }).transform((date) => date.toISOString()),

  /* Primary password */
  password: passwordSchema,

  /* Password confirmation */
  verifyPassword: passwordSchema,

  /* Unique email address */
  email: z.string().max(255, {
    message: "Email must be at most 255 characters long"
  }).email({
    message: "Invalid email address"
  }),
}).strict().refine(data => data.password === data.verifyPassword, {
  message: "Passwords do not match",
  path: ["verifyPassword"]
});

/**
 * Core user data without verification fields
 *
 * @see {@link userSchema} - Schema defining validation rules
 */
export type User = Omit<z.infer<typeof userSchema>, "verifyPassword">;

/**
 * Schema for user update validation
 *
 * @see {@link userSchema} - Base schema this derives from
 * @see {@link UserUpdates} - Type inferred from this schema
 */
export const updateUserSchema = userSchema.innerType().partial().extend({
  password: passwordSchema.optional(),
  newPassword: passwordSchema.optional(),
  verifyPassword: passwordSchema.optional()
}).superRefine((data, ctx) => {
  const { password, newPassword, verifyPassword } = data;

  // Check if the user is attempting to update their password
  const hasPasswordUpdates = password || newPassword || verifyPassword;

  if (hasPasswordUpdates) {
    // Ensure all password fields are provided
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
 * Public user profile information
 *
 * @see {@link User} - Base user type this derives from
 */
export type UserDetails = Omit<User, "user_id" | "password">;

/**
 * User data for profile update operations
 *
 * @see {@link updateUserSchema} - Schema defining validation rules
 */
export type UserUpdates = Omit<z.infer<typeof updateUserSchema>, "user_id">;