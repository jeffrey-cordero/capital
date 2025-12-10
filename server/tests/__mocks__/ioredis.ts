import { jest } from "@jest/globals";

/**
 * Mock Redis class with mocked methods for unit testing purposes
 */
const Redis = jest.fn(() => ({
   on: jest.fn(),
   get: jest.fn(),
   setex: jest.fn(),
   del: jest.fn()
}));

export default Redis;