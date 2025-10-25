import { parse } from "pgsql-ast-parser";

/**
 * Set of SQL queries that are not valid and should be excluded from validation
 */
const sqlValidationExceptions = new Set([
   "ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger",
   "ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger"
]);

/**
 * Mock database pool type for testing
 */
export interface MockPool {
   query: jest.Mock;
   connect: jest.Mock;
   end: jest.Mock;
   on: jest.Mock;
}

/**
 * Mock database client type for testing
 */
export interface MockClient {
   query: jest.Mock;
   release: jest.Mock;
   connect: jest.Mock;
}

/**
 * Create a fresh mock database pool for testing
 */
export function createMockPool(): MockPool {
   return {
      query: jest.fn().mockResolvedValue(createMockQueryResult()),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn()
   };
}

/**
 * Create a fresh mock database client for testing
 */
export function createMockClient(): MockClient {
   return {
      query: jest.fn().mockResolvedValue(createMockQueryResult()),
      release: jest.fn(),
      connect: jest.fn()
   };
}

/**
 * Helper function to mock a client query with a rejected value once
 *
 * @param {Error | string} error - Error to reject with
 * @param {MockClient} mockClient - Mock client instance
 */
export function mockClientQueryRejectedOnce(error: Error | string, mockClient: MockClient): void {
   const errorObj = typeof error === "string" ? new Error(error) : error;
   mockClient.query.mockRejectedValueOnce(errorObj);
}

/**
 * Helper function to mock budgetsRepository createCategory with rejected value once
 *
 * @param {string} errorMessage - Error message to reject with
 */
export function mockCreateCategoryRejected(errorMessage: string): void {
   const budgetsRepository = require("@/repository/budgetsRepository");
   budgetsRepository.createCategory.mockRejectedValueOnce(new Error(errorMessage));
}

/**
 * Mock database query result
 */
export function createMockQueryResult(rows: any[] = []): any {
   return {
      rows,
      rowCount: rows.length,
      command: "SELECT",
      oid: 0,
      fields: []
   };
}

/**
 * Arrange mock pool query to return specific data
 *
 * @param {any[]} rows - Array of rows to return
 * @param {MockPool} mockPool - Mock pool instance
 */
export function arrangeMockQuery(rows: any[] = [], mockPool: MockPool): void {
   mockPool.query.mockResolvedValue(createMockQueryResult(rows));
}

/**
 * Arrange mock pool query to throw an error
 *
 * @param {string} errorMessage - Error message to throw
 * @param {MockPool} mockPool - Mock pool instance
 */
export function arrangeMockQueryError(errorMessage: string, mockPool: MockPool): void {
   mockPool.query.mockRejectedValueOnce(new Error(errorMessage));
}

/**
 * Arranges a mock transaction flow with a sequence of query results or errors, where the
 * Error should be the final step in the flow if an error is expected.
 *
 * @param {jest.MockedFunction} mockQuery - The mock query function to configure
 * @param {Array<any | Error>} steps - Array of query results or Error objects
 */
export function arrangeMockTransactionFlow(mockQuery: jest.MockedFunction<any>, steps: Array<any | Error>): void {
   for (const step of steps) {
      if (step instanceof Error) {
         mockQuery.mockRejectedValueOnce(step);
      } else {
         mockQuery.mockResolvedValueOnce(step ?? {});
      }
   }
}

/**
 * Reset all Jest and database mocks
 *
 * @param {MockPool} globalMockPool - Global mock pool instance
 * @param {MockPool} mockPool - Mock pool instance
 * @param {MockClient} mockClient - Mock client instance
 */
export function resetDatabaseMocks(globalMockPool: MockPool, mockPool: MockPool, mockClient: MockClient): void {
   jest.clearAllMocks();

   // Both query execution mocks should point to the same mock client
   mockPool.query = mockClient.query;

   // Return the mock database client from the mock pool for transaction operations
   mockPool.connect.mockResolvedValue(mockClient);

   // Global mock pool should point to the same mock pool mocks for the current test
   globalMockPool.query = mockPool.query;
   globalMockPool.connect = mockPool.connect;
}

/**
 * Assert that query was not called
 * @param {MockPool} mockPool - Mock pool instance
 */
export function assertQueryNotCalled(mockPool: MockPool): void {
   expect(mockPool.query).not.toHaveBeenCalled();
}

/**
 * Assert that client was released
 * @param {MockClient} mockClient - Mock client instance
 */
export function assertClientReleased(mockClient: MockClient): void {
   expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Assert that ROLLBACK was called
 *
 * @param {MockClient} mockClient - Mock client instance
 * @param {number} expectedStatements - Expected number of statements to be called not including BEGIN/ROLLBACK
 */
export function assertTransactionRollback(mockClient: MockClient, expectedStatements: number): void {
   const mockClientQueries: any[] = mockClient.query.mock.calls;
   const totalQueries: number = mockClientQueries.length;

   // BEGIN, statements, and ROLLBACK must be called
   expect(totalQueries).toBe(expectedStatements + 2);

   // BEGIN must be called with the proper isolation level
   expect(mockClientQueries[0][0]).toMatch(
      /^BEGIN TRANSACTION ISOLATION LEVEL (READ UNCOMMITTED|READ COMMITTED|REPEATABLE READ|SERIALIZABLE);?$/
   );
   // COMMIT must not be called for a proper transaction rollback
   expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT;");

   // ROLLBACK must be called
   expect(mockClientQueries[totalQueries - 1][0]).toBe("ROLLBACK;");
   assertClientReleased(mockClient);
}

/**
 * Assert a mock query result matches the expected data
 *
 * @param {any} result - Actual query result
 * @param {any} expectedData - Expected data
 */
export function assertQueryResult(result: any, expectedData: any): void {
   expect(result).toEqual(expectedData);
}

/**
 * Assert a mock query result matches the expected data and the client was released (for transaction-based operations)
 *
 * @param {any} result - Actual query result
 * @param {any} expectedData - Expected data
 * @param {MockClient} mockClient - Mock client instance
 */
export function assertTransactionResult(result: any, expectedData: any, mockClient: MockClient): void {
   expect(result).toEqual(expectedData);
   assertClientReleased(mockClient);
}

/**
 * Assert that SQL query is valid by parsing it with exception for triggers
 *
 * @param {string} sql - SQL query string to validate
 * @returns {void}
 */
export function assertValidSQL(sql: string): void {
   if (sqlValidationExceptions.has(sql)) return;

   expect(() => parse(sql)).not.toThrow();
}

/**
 * Assert that a mock query was called with valid SQL syntax, expected key phrases, and exact parameters
 *
 * @param {string[]} keyPhrases - Key phrases that should be present in the SQL
 * @param {any[]} expectedParams - Expected parameters array
 * @param {number} callIndex - Index of the query call to check for matching key phrases and parameters
 * @param {MockPool} mockPool - Mock pool instance
 */
export function assertQueryCalledWithKeyPhrases(
   keyPhrases: string[],
   expectedParams: any[],
   callIndex: number,
   mockPool: MockPool
): void {
   // Ensure the specific call index exists
   expect(mockPool.query.mock.calls.length).toBeGreaterThanOrEqual(callIndex + 1);

   const [expectedSql, actualParams] = mockPool.query.mock.calls[callIndex];

   // Validate that the SQL is syntactically correct
   assertValidSQL(expectedSql);

   // Check that all key phrases are present in the SQL
   keyPhrases.forEach(phrase => {
      expect(expectedSql).toContain(phrase);
   });

   // Check exact parameter match
   expect(expectedParams).toEqual(actualParams || []);
}

/**
 * Arrange UPDATE query structure test for single or multiple fields - pure SQL structure validation
 *
 * @param {string} tableName - Name of the table to update
 * @param {Record<string, any>} updates - Updates object (single or multiple fields)
 * @param {string} idField - ID field name (e.g., "user_id", "account_id")
 * @param {string} idValue - ID value
 * @param {Function} updateFn - Repository update function
 * @param {MockPool} mockPool - Mock pool instance
 */
export async function arrangeUpdateQueryStructure(
   tableName: string,
   updates: Record<string, any>,
   idField: string,
   idValue: string,
   updateFn: (_id: string, _updates: Record<string, any>) => Promise<boolean>,
   mockPool: MockPool
): Promise<void> {
   // Mock successful response to prevent actual database call
   arrangeMockQuery([{ [idField]: idValue }], mockPool);

   // Call the provided update function
   await updateFn(idValue, updates);

   // Use the fields in the order they appear in the updates object
   const fields = Object.keys(updates);
   const values = Object.values(updates);

   const keyPhrases = [
      `UPDATE ${tableName}`,
      "SET",
      "RETURNING"
   ];

   // Add field-specific phrases with exact parameter indices
   // For multiple fields, they are joined with commas in the actual SQL
   if (fields.length === 1) {
      keyPhrases.push(`${fields[0]} = $1`);
   } else {
      const fieldAssignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
      keyPhrases.push(fieldAssignments);
   }

   // Add the WHERE clause parameter index
   keyPhrases.push(`WHERE ${idField} = $${fields.length + 1}`);

   const expectedParams = [...values, idValue];
   assertQueryCalledWithKeyPhrases(keyPhrases, expectedParams, 0, mockPool);
}

/**
 * Expect a repository function to throw a database error and verify it throws
 *
 * @param {Function} repositoryFunction - Repository function to test
 * @param {string} expectedErrorMessage - Expected error message
 * @returns {Promise<void>}
 */
export async function expectRepositoryToThrow(
   repositoryFunction: () => Promise<any>,
   expectedErrorMessage: string
): Promise<void> {
   try {
      await repositoryFunction();
      throw new Error(`Expected repository to throw "${expectedErrorMessage}" but it succeeded`);
   } catch (error: any) {
      expect(error.message).toBe(expectedErrorMessage);
   }
}

/**
 * Assert object has specific properties and not others
 *
 * @param {Record<string, any>} obj - Object to validate
 * @param {string[]} requiredProperties - Properties that should exist
 * @param {string[]} excludedProperties - Properties that should not exist
 */
export function assertObjectProperties(obj: Record<string, any>, requiredProperties: string[], excludedProperties: string[] = []): void {
   requiredProperties.forEach(prop => {
      expect(obj).toHaveProperty(prop);
   });

   excludedProperties.forEach(prop => {
      expect(obj).not.toHaveProperty(prop);
   });
}