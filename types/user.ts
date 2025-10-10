import { z } from "zod";

/**
 * Password validation rules for security compliance
 */
const passwordSchema = z.string().min(8, {
  message: "Password must be at least 8 characters"
}).max(255, {
  message: "Password must be at most 255 characters"
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
  username: z.string().trim().min(2, {
    message: "Username must be at least 2 characters"
  }).max(30, {
    message: "Username must be at most 30 characters"
  }).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Username may only contain letters, numbers, underscores, and hyphens"
  }),

  /* Full name */
  name: z.string().trim().min(2, {
    message: "Name must be at least 2 characters"
  }).max(30, {
    message: "Name must be at most 30 characters"
  }),

  /* Birthdate */
  birthday: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        // Empty string is considered undefined to ensure the proper error message is displayed
        return val.trim() === "" ? undefined : new Date(val);
      } else {
        return val;
      }
    },
    z.date({
      required_error: "Birthday is required",
      invalid_type_error: "Birthday must be a valid date",
    })
    .min(new Date("1800-01-01"), { message: "Birthday must be on or after 1800-01-01" })
    .max(new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Kiritimati" })), {
      message: "Birthday cannot be in the future"
    })
    .transform((date) => date.toISOString())
  ),

  /* Primary password */
  password: passwordSchema,

  /* Password confirmation */
  verifyPassword: passwordSchema,

  /* Unique email address */
  email: z.string().max(255, {
    message: "Email must be at most 255 characters"
  }).email({
    message: "Invalid email address"
  }),
}).strict().refine(data => data.password === data.verifyPassword, {
  message: "Passwords don't match",
  path: ["verifyPassword"]
});

/**
 * Login schema with username and password fields
 * Note: Password validation is minimal for login (only length check)
 */
export const loginSchema = z.object({
  username: userSchema.innerType().shape.username,
  password: userSchema.innerType().shape.password
});

/**
 * Login payload type
 *
 * @see {@link userSchema} - Schema defining validation rules
 */
export type LoginPayload = {
  username: z.infer<typeof userSchema>["username"],
  password: z.infer<typeof userSchema>["password"]
};

/**
 * Register payload type
 *
 * @see {@link userSchema} - Schema defining validation rules
 */
export type RegisterPayload = Omit<z.infer<typeof userSchema>, "user_id">;

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
        message: "Passwords don't match",
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

/**
 * Valid registration test data with secure password that meets all requirements
 *
 * Note: username and email fields should be set dynamically in tests to ensure uniqueness
 */
export const VALID_REGISTRATION: RegisterPayload = {
  // Will be set dynamically for each test
  username: "",
  email: "",
  // Static test data
  birthday: "1990-01-01",
  name: "Test User",
  password: "Password1!",
  verifyPassword: "Password1!"
};

/**
 * Valid login test data matching registration password
 *
 * Note: username field should be set dynamically in tests to match registered user
 */
export const VALID_LOGIN: LoginPayload = {
  // Will be set dynamically for each test
  username: "",
  // Static test data
  password: "Password1!"
};

/**
 * Generates unique test credentials for username and email
 *
 * Combines timestamp and random suffix to ensure uniqueness across test runs.
 * The username is derived from the email prefix for consistency.
 *
 * @returns {{ username: string; email: string }} Object containing unique username and email
 */
export const generateTestCredentials = (): { username: string; email: string } => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const identifier = `${timestamp}-${randomSuffix}`;

  // Username limited to 30 characters for validation purposes
  const username = identifier.substring(0, 30);
  const email = `${identifier}@example.com`;

  return { username, email };
};

/**
 * Creates valid user registration data
 *
 * @returns {RegisterPayload} Complete valid registration data with unique credentials
 */
export const createValidRegistration = (): RegisterPayload => ({
  ...VALID_REGISTRATION,
  ...generateTestCredentials()
});

/**
 * Creates valid user login data
 *
 * @returns {LoginPayload} Complete valid login data with unique credentials
 */
export const createValidLogin = (): LoginPayload => {
  const { username } = generateTestCredentials();
  return { ...VALID_LOGIN, username };
};

/**
 * Creates user data with weak password (missing requirements)
 *
 * @param {string} weakness - Type of password weakness to test
 * @returns {RegisterPayload} Registration data with specified password weakness
 */
export const createUserWithWeakPassword = (weakness: "tooShort" | "noUppercase" | "noLowercase" | "noNumber" | "noSpecial" = "tooShort"): RegisterPayload => {
  const passwords = {
    tooShort: "Short1!",
    noUppercase: "password123!",
    noLowercase: "PASSWORD123!",
    noNumber: "Password!",
    noSpecial: "Password123"
  };

  const password = passwords[weakness];

  return {
    ...VALID_REGISTRATION,
    ...generateTestCredentials(),
    password,
    verifyPassword: password
  };
};

/**
 * Creates user data with mismatched password confirmation
 *
 * @returns {RegisterPayload} Registration data with mismatched passwords
 */
export const createUserWithMismatchedPasswords = (): RegisterPayload => ({
  ...VALID_REGISTRATION,
  ...generateTestCredentials(),
  password: "Password123!",
  verifyPassword: "Password456!"
});

/**
 * Creates user data with invalid email format
 *
 * @param {string} invalidType - Type of email invalidity to test
 * @returns {RegisterPayload} Registration data with invalid email
 */
export const createUserWithInvalidEmail = (invalidType: "noAtSymbol" | "noDomain" | "noUsername" = "noAtSymbol"): RegisterPayload => {
  const { username } = generateTestCredentials();

  const emails = {
    noAtSymbol: `${username}example.com`,
    noDomain: `${username}@`,
    noUsername: "@example.com"
  };

  return {
    ...VALID_REGISTRATION,
    username,
    email: emails[invalidType]
  };
};

/**
 * Creates login data for an existing user
 *
 * @param {string} username - Username of existing user
 * @returns {LoginPayload} Login data for the specified user
 */
export const createLoginCredentials = (username: string): LoginPayload => ({ 
  ...VALID_LOGIN, 
  username 
});
