/**
 * Test token constants for authentication testing, used across middleware and controller tests for consistent token testing
 */
export const TEST_TOKENS = {
   VALID_ACCESS: "valid.access.token",
   INVALID_ACCESS: "invalid.access.token",
   EXPIRED_ACCESS: "expired.access.token",
   MALFORMED_ACCESS: "malformed.access.token",
   VALID_REFRESH: "valid.refresh.token",
   INVALID_REFRESH: "invalid.refresh.token",
   EXPIRED_REFRESH: "expired.refresh.token",
   MALFORMED_REFRESH: "malformed.refresh.token"
} as const;

/**
 * Test user ID constant
 */
export const TEST_USER_ID = "test-user-123";

/**
 * Test secret key constant
 */
export const TEST_SECRET = "test-secret-key";

/**
 * Test user payload constant for JWT tokens
 */
export const TEST_USER_PAYLOAD = { user_id: TEST_USER_ID };
