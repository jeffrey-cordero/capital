import { TEST_USER_ID } from "capital/mocks/user";

/**
 * Test token constants for mocking authentication tokens used across middleware and authentication service tests
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
 * Test secret key constant
 */
export const TEST_SECRET = "test-secret-key";

/**
 * Test user payload constant for JWT tokens
 */
export const TEST_USER_PAYLOAD = { user_id: TEST_USER_ID };