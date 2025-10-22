import { Pool, PoolClient } from "pg";

/**
 * Mock database pool for testing
 */
export const mockPool = {
   query: jest.fn(),
   connect: jest.fn(),
   end: jest.fn(),
   on: jest.fn()
} as unknown as Pool;

/**
 * Mock database client for testing
 */
export const mockClient = {
   query: jest.fn(),
   release: jest.fn(),
   connect: jest.fn()
} as unknown as PoolClient;

/**
 * Mock database query result
 */
export const createMockQueryResult = (rows: any[] = []) => ({
   rows,
   rowCount: rows.length,
   command: "SELECT",
   oid: 0,
   fields: []
});