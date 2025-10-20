import type { LoginPayload, RegisterPayload, User, UserDetails, UserUpdates } from "../user";

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
 * @returns {{ username: string; email: string }} Object containing unique username and email
 */
export const generateTestCredentials = (): { username: string; email: string } => {
  const length = 62;
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes = (globalThis as any).crypto.getRandomValues(new Uint8Array(length));
  const identifier = Array.from(randomBytes, (b: number) => alphabet[b % alphabet.length]).join("").substring(0, 30);

  return {
    username: identifier,
    email: `${identifier}@example.com`
  };
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

/**
 * Creates mock UserDetails object (without sensitive fields)
 *
 * @param {Partial<UserDetails>} overrides - Properties to override in the mock user details
 * @returns {UserDetails} Mock user details object
 */
export const createMockUserDetails = (overrides: Partial<UserDetails> = {}): UserDetails => {
  const { username, email } = generateTestCredentials();
  return {
    username,
    email,
    name: "Test User",
    birthday: "1990-01-01",
    ...overrides
  };
};

/**
 * Creates valid UserUpdates payload for testing
 *
 * @param {Partial<UserUpdates>} overrides - Properties to override in the mock updates
 * @returns {Partial<UserUpdates>} Mock user updates object
 */
export const createMockUserUpdates = (overrides: Partial<UserUpdates> = {}): Partial<UserUpdates> => {
  const { username, email } = generateTestCredentials();
  return {
    username,
    email,
    name: "Updated Test User",
    birthday: "1990-01-01",
    ...overrides
  };
};

/**
 * Creates UserUpdates payload with password change fields
 *
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password to set
 * @param {Partial<UserUpdates>} overrides - Additional properties to override
 * @returns {Partial<UserUpdates>} Mock user updates with password change
 */
export const createUserUpdatesWithPasswordChange = (
  currentPassword: string = "Password1!",
  newPassword: string = "NewPassword1!",
  overrides: Partial<UserUpdates> = {}
): Partial<UserUpdates> => ({
  password: currentPassword,
  newPassword,
  verifyPassword: newPassword,
  ...overrides
});

/**
 * Creates a user with specific username/email for conflict testing
 *
 * @param {string} username - Specific username to use
 * @param {string} email - Specific email to use
 * @param {Partial<User>} overrides - Additional properties to override
 * @returns {User} Mock user with specified credentials
 */
export const createConflictingUser = (
  username: string,
  email: string,
  overrides: Partial<User> = {}
): User => ({
  user_id: "conflict-user-id-123",
  username,
  email,
  name: "Conflict User",
  birthday: "1990-01-01",
  password: "Password1!",
  ...overrides
});

/**
 * Creates invalid UserUpdates payload for validation testing
 *
 * @param {string} invalidType - Type of invalidity to test
 * @returns {Partial<UserUpdates>} Invalid user updates object
 */
export const createInvalidUserUpdates = (invalidType: "invalidEmail" | "invalidUsername" | "invalidBirthday" = "invalidEmail"): Partial<UserUpdates> => {
  const { username } = generateTestCredentials();
  
  const invalidUpdates = {
    invalidEmail: {
      username,
      email: "invalid-email-format"
    },
    invalidUsername: {
      username: "a", // Too short
      email: `${username}@example.com`
    },
    invalidBirthday: {
      username,
      email: `${username}@example.com`,
      birthday: "invalid-date"
    }
  };

  return invalidUpdates[invalidType];
};

/**
 * Creates user data with case variations for conflict testing
 *
 * @param {string} baseUsername - Base username to create variations from
 * @param {string} baseEmail - Base email to create variations from
 * @param {string} variation - Type of case variation
 * @returns {User} Mock user with case-varied credentials
 */
export const createUserWithCaseVariation = (
  baseUsername: string,
  baseEmail: string,
  variation: "uppercase" | "lowercase" | "mixed" = "uppercase"
): User => {
  const variations = {
    uppercase: {
      username: baseUsername.toUpperCase(),
      email: baseEmail.toUpperCase()
    },
    lowercase: {
      username: baseUsername.toLowerCase(),
      email: baseEmail.toLowerCase()
    },
    mixed: {
      username: baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1).toLowerCase(),
      email: baseEmail.charAt(0).toUpperCase() + baseEmail.slice(1).toLowerCase()
    }
  };

  return createConflictingUser(
    variations[variation].username,
    variations[variation].email
  );
};
