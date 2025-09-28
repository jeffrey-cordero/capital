/**
 * Test utilities and constants for server tests
 */

import { ServerResponse, HTTP_STATUS } from 'capital/server';

export const TEST_CONSTANTS = {
  API_BASE_URL: '',
  TEST_USER_ID: 'test-user-id-123',
  TEST_EMAIL: 'test@example.com',
  TEST_USERNAME: 'testuser',
  TEST_PASSWORD: 'testpassword123',
  TEST_NAME: 'Test User',
  TEST_BIRTHDAY: '1990-01-01',
} as const;

export const MOCK_RESPONSES = {
  SUCCESS: {
    code: HTTP_STATUS.OK,
    data: { success: true, message: 'Operation successful' },
  } as ServerResponse,
  ERROR: {
    code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors: { server: 'Operation failed' },
  } as ServerResponse,
} as const;

/**
 * Creates a mock Express request object
 */
export const createMockRequest = (overrides: Partial<any> = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ip: '127.0.0.1',
  ...overrides,
});

/**
 * Creates a mock Express response object
 */
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

/**
 * Creates a mock user object for testing
 */
export const createMockUser = (overrides: Partial<any> = {}) => ({
  user_id: TEST_CONSTANTS.TEST_USER_ID,
  username: TEST_CONSTANTS.TEST_USERNAME,
  email: TEST_CONSTANTS.TEST_EMAIL,
  name: TEST_CONSTANTS.TEST_NAME,
  birthday: TEST_CONSTANTS.TEST_BIRTHDAY,
  password: TEST_CONSTANTS.TEST_PASSWORD,
  ...overrides,
});
