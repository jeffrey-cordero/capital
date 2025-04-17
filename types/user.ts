import { z } from "zod";

/**
 * Advanced password validation requirements for security compliance
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
 * Robust schema for user validation with comprehensive rules, which
 * enforces strict type safety and business logic constraints for all user data
 * including format validation, security requirements, and data integrity.
 *
 * @see {@link User} - The type inferred from this schema.
 */
export const userSchema = z.object({
  /** Unique user identifier (UUID) */
  user_id: z.string().trim().uuid({
    message: "User ID must be a valid UUID"
  }).nullable().optional(),

  /** Username with length and character constraints (3-30 characters) */
  username: z.string().trim().min(3, {
    message: "Username must be at least 3 characters"
  }).max(30, {
    message: "Username must be at most 30 characters"
  }).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Username may only contain letters, numbers, underscores, and hyphens"
  }),

  /** Display name with length validation (3-30 characters) */
  name: z.string().trim().min(3, {
    message: "Name must be at least 3 characters"
  }).max(30, {
    message: "Name must be at most 30 characters"
  }),

  /** User birthdate with historical and future bounds protection (1800-present) */
  birthday: z.coerce.date({
    message: "Birthday must be a valid date"
  }).min(new Date("1800-01-01"), {
    message: "Birthday must be on or after 1800-01-01"
  }).max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
    message: "Birthday cannot be in the future"
  }).transform((date) => date.toISOString()),

  /** Primary password with security requirements (8+ characters, mixed case, numbers) */
  password: passwordSchema,

  /** Password confirmation for validation */
  verifyPassword: passwordSchema,

  /** Email address with format validation (max 255 characters) */
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
 * Represents core user data without verification fields inferred from the validation schema.
 *
 * @see {@link userSchema} - The Zod schema defining this structure's validation rules.
 */
export type User = Omit<z.infer<typeof userSchema>, "verifyPassword">;

/**
 * Robust schema for user updates with comprehensive security rules, which
 * enforces strict password change policies and data integrity validation
 * for partial user profile updates.
 *
 * @see {@link userSchema} - The Zod schema that this derives from.
 * @see {@link UserUpdates} - The type inferred from this schema.
 */
export const updateUserSchema = userSchema.innerType().partial().extend({
  newPassword: passwordSchema
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
 * Represents public user profile information inferred from the validation schema.
 *
 * @see {@link User} - The base user type that this derives from.
 */
export type UserDetails = Omit<User, "user_id" | "password">;

/**
 * Represents user data for profile update operations inferred from the validation schema.
 *
 * @see {@link updateUserSchema} - The Zod schema defining this structure's validation rules.
 */
export type UserUpdates = Omit<z.infer<typeof updateUserSchema>, "user_id">;