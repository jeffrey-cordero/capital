/**
 * Test utilities and constants for server tests
 */

/**
 * Creates a mock Express request object
 */
export const createMockRequest = (overrides: Partial<any> = {}) => ({
   body: {},
   params: {},
   query: {},
   headers: {},
   ip: "127.0.0.1",
   ...overrides
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