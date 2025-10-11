import type { ServerResponse } from "../server";
import { HTTP_STATUS } from "../server";

/**
 * Test constants for server testing
 */
export const TEST_CONSTANTS = {
   API_BASE_URL: "",
   TEST_USER_ID: "test-user-id-123",
   TEST_EMAIL: "test@example.com",
   TEST_USERNAME: "testuser",
   TEST_PASSWORD: "testpassword123",
   TEST_NAME: "Test User",
   TEST_BIRTHDAY: "1990-01-01"
} as const;

/**
 * Mock server responses for testing
 */
export const MOCK_RESPONSES = {
   SUCCESS: {
      code: HTTP_STATUS.OK,
      data: { success: true, message: "Operation successful" }
   } as ServerResponse,
   ERROR: {
      code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      errors: { server: "Operation failed" }
   } as ServerResponse,
   VALIDATION_ERROR: {
      code: HTTP_STATUS.BAD_REQUEST,
      errors: { validation: "Invalid input data" }
   } as ServerResponse,
   UNAUTHORIZED: {
      code: HTTP_STATUS.UNAUTHORIZED,
      errors: { auth: "Authentication required" }
   } as ServerResponse,
   NOT_FOUND: {
      code: HTTP_STATUS.NOT_FOUND,
      errors: { resource: "Resource not found" }
   } as ServerResponse
} as const;

/**
 * Creates a mock user object for testing
 *
 * @param {Partial<any>} overrides - Properties to override in the mock user
 * @returns {any} Mock user object with test data
 */
export const createMockUser = (overrides: Partial<any> = {}): any => ({
   user_id: TEST_CONSTANTS.TEST_USER_ID,
   username: TEST_CONSTANTS.TEST_USERNAME,
   email: TEST_CONSTANTS.TEST_EMAIL,
   name: TEST_CONSTANTS.TEST_NAME,
   birthday: TEST_CONSTANTS.TEST_BIRTHDAY,
   password: TEST_CONSTANTS.TEST_PASSWORD,
   ...overrides
});

/**
 * Creates a mock server response
 *
 * @param {number} code - HTTP status code
 * @param {any} data - Response data
 * @param {Record<string, string>} errors - Response errors
 * @returns {ServerResponse} Mock server response
 */
export const createMockResponse = (
   code: number = HTTP_STATUS.OK,
   data?: any,
   errors?: Record<string, string>
): ServerResponse => ({
   code,
   ...(data && { data }),
   ...(errors && { errors })
});

/**
 * Creates a successful server response
 *
 * @param {any} data - Response data
 * @returns {ServerResponse} Successful server response
 */
export const createSuccessResponse = (data?: any): ServerResponse => 
   createMockResponse(HTTP_STATUS.OK, data);

/**
 * Creates an error server response
 *
 * @param {number} code - HTTP error status code
 * @param {Record<string, string>} errors - Error messages
 * @returns {ServerResponse} Error server response
 */
export const createErrorResponse = (
   code: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
   errors: Record<string, string> = { server: "Operation failed" }
): ServerResponse => createMockResponse(code, undefined, errors);
