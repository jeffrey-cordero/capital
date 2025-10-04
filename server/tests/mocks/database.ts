/**
 * Database mocks for server tests
 */
import { Pool, PoolClient } from 'pg';

/**
 * Mock database pool for testing
 */
export const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
} as unknown as Pool;

/**
 * Mock database client for testing
 */
export const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
  connect: jest.fn(),
} as unknown as PoolClient;

/**
 * Mock database query result
 */
export const createMockQueryResult = (rows: any[] = []) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

/**
 * Mock successful database query
 */
export const mockSuccessfulQuery = (rows: any[] = []) => {
  (mockPool.query as jest.Mock).mockResolvedValue(createMockQueryResult(rows));
  (mockClient.query as jest.Mock).mockResolvedValue(createMockQueryResult(rows));
};

/**
 * Mock database error
 */
export const mockDatabaseError = (message: string = 'Database error') => {
  const error = new Error(message);
  (mockPool.query as jest.Mock).mockRejectedValue(error);
  (mockClient.query as jest.Mock).mockRejectedValue(error);
};

/**
 * Reset all database mocks
 */
export const resetDatabaseMocks = () => {
  jest.clearAllMocks();
  (mockPool.query as jest.Mock).mockClear();
  (mockClient.query as jest.Mock).mockClear();
};

