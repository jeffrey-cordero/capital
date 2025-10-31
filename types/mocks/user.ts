import type {
   LoginPayload,
   RegisterPayload,
   User,
   UserDetails,
   UserUpdates
} from "../user";

/**
 * Valid registration test data with secure password that meets all requirements
 */
export const VALID_REGISTRATION: RegisterPayload = {
   /* Username and email to be set dynamically for each test */
   username: "",
   email: "",
   /* Static test data */
   birthday: "1990-01-01",
   name: "Test User",
   password: "Password1!",
   verifyPassword: "Password1!"
};

/**
 * Valid login test data matching registration password
 */
export const VALID_LOGIN: LoginPayload = {
   /* Username to be set dynamically for each test */
   username: "",
   /* Static test password */
   password: "Password1!"
};

/**
 * Test user ID constant
 */
export const TEST_USER_ID = "test-user-id-123";

/**
 * Shared invalid password cases for tests
 */
export const INVALID_PASSWORD_CASES = [
   { name: "too short", password: "Short1!", expected: "Password must be at least 8 characters" },
   { name: "no uppercase", password: "password1!", expected: "Password must contain at least one uppercase letter" },
   { name: "no lowercase", password: "PASSWORD1!", expected: "Password must contain at least one lowercase letter" },
   { name: "no number", password: "Password!", expected: "Password must contain at least one number" }
] as const;

/**
 * Alphabet for generating unique test credentials
 */
const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generates unique test credentials for username and email
 *
 * @returns {{ username: string; email: string }} Unique username and email
 */
export const generateTestCredentials = (): { username: string; email: string } => {
   const randomBytes: Uint8Array = (globalThis as any).crypto.getRandomValues(new Uint8Array(30));
   const identifier: string = Array.from(randomBytes, (b: number) => alphabet[b % alphabet.length]).join("");

   return {
      username: identifier,
      email: `${identifier}@example.com`
   };
};

/**
 * Creates valid user registration data with unique credentials
 *
 * @returns {RegisterPayload} Valid registration payload
 */
export const createValidRegistration = (): RegisterPayload => ({
   ...VALID_REGISTRATION,
   ...generateTestCredentials()
});

/**
 * Creates user data with mismatched password confirmation
 *
 * @returns {RegisterPayload} Registration payload with mismatched passwords
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
 * @returns {RegisterPayload} Registration payload with invalid email
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
 * Creates valid user login data with unique credentials
 *
 * @returns {LoginPayload} Valid login payload
 */
export const createValidLogin = (): LoginPayload => ({
   ...VALID_LOGIN,
   username: generateTestCredentials().username
});

/**
 * Creates a mock user object for testing
 *
 * @param {Partial<User>} overrides - Properties to override
 * @returns {User} Mock user object
 */
export const createMockUser = (overrides: Partial<User> = {}): User => {
   const { username, email } = generateTestCredentials();
   return {
      user_id: TEST_USER_ID,
      username,
      email,
      name: "Test User",
      birthday: "1990-01-01",
      password: "testpassword123",
      ...overrides
   };
};

/**
 * Creates a mock user and extracts the expected user details for testing
 *
 * @param {Partial<User>} overrides - Properties to override
 * @returns {Object} Object containing mockUser and expectedUserDetails
 */
export const createMockUserWithDetails = (overrides: Partial<User> = {}): { mockUser: User; expectedUserDetails: UserDetails } => {
   const mockUser: User = createMockUser(overrides);
   return {
      mockUser,
      expectedUserDetails: {
         username: mockUser.username,
         name: mockUser.name,
         email: mockUser.email,
         birthday: mockUser.birthday
      }
   };
};

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

/**
 * Creates valid UserUpdates payload for testing
 *
 * @param {Partial<UserUpdates>} overrides - Properties to override
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
 * @returns {Partial<UserUpdates>} User updates with password change
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