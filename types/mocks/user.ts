import type { LoginPayload, RegisterPayload } from "../user";

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
