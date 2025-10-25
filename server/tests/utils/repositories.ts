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
 * Mock database query result type for testing
 */
export interface MockQueryResult {
   rows: any[];
   rowCount: number;
   command: string;
   oid: number;
   fields: any[];
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
 * Mock database query result
 */
export function createMockQueryResult(rows: any[] = []): MockQueryResult {
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
 * Arranges a mock transaction flow with a sequence of query results or errors, where
 * an error should be the final step in the flow if an error is expected.
 *
 * @param {jest.MockedFunction} mockQuery - The mock query function to configure
 * @param {Array<any | Error>} steps - Array of query results or error items
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
 * Reset all Jest mocks and normalizes all current database mocks to the same mock client
 *
 * @param {MockPool} globalMockPool - Global mock pool instance
 * @param {MockPool} mockPool - Mock pool instance
 * @param {MockClient} mockClient - Mock client instance
 */
export function resetDatabaseMocks(globalMockPool: MockPool, mockPool: MockPool, mockClient: MockClient): void {
   jest.clearAllMocks();

   // Both query execution and connection mocks should point to the same mock client for all tests
   mockPool.query = mockClient.query;
   mockPool.connect.mockResolvedValue(mockClient);

   // Global mock pool should point to the same mock pool for all tests
   globalMockPool.query = mockPool.query;
   globalMockPool.connect = mockPool.connect;
}

/**
 * Assert that query was not called
 *
 * @param {MockPool} mockPool - Mock pool instance
 */
export function assertQueryNotCalled(mockPool: MockPool): void {
   expect(mockPool.query).not.toHaveBeenCalled();
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
 * Assert that client was released
 *
 * @param {MockClient} mockClient - Mock client instance
 */
export function assertClientReleased(mockClient: MockClient): void {
   expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Assert that a rollback was called with the proper number of statements
 *
 * @param {MockClient} mockClient - Mock client instance
 * @param {number} expectedStatements - Expected number of statements to be called not including BEGIN/ROLLBACK
 */
export function assertTransactionRollback(mockClient: MockClient, expectedStatements: number): void {
   const mockClientQueries: any[] = mockClient.query.mock.calls;
   const totalQueries: number = mockClientQueries.length;

   // BEGIN, ROLLBACK, and the expected number of statements must be called
   expect(totalQueries).toBe(expectedStatements + 2);

   // BEGIN must be called with the proper isolation level
   expect(mockClientQueries[0][0]).toMatch(
      /^BEGIN TRANSACTION ISOLATION LEVEL (READ UNCOMMITTED|READ COMMITTED|REPEATABLE READ|SERIALIZABLE);?$/
   );
   expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT;");
   expect(mockClientQueries[totalQueries - 1][0]).toBe("ROLLBACK;");

   // The client should always be released after the rollback
   assertClientReleased(mockClient);
}

/**
 * Assert a mock query result matches the expected data and the client was released
 * for transaction-based operations
 *
 * @param {any} result - Actual query result
 * @param {any} expectedData - Expected data
 * @param {MockClient} mockClient - Mock client instance
 */
export function assertTransactionResult(result: any, expectedData: any, mockClient: MockClient): void {
   assertQueryResult(result, expectedData);
   assertClientReleased(mockClient);
}

/**
 * Assert that SQL query is valid by parsing it with exceptions for database triggers
 *
 * @param {string} sql - SQL query string to validate
 */
export function assertValidSQL(sql: string): void {
   if (sqlValidationExceptions.has(sql)) return;

   expect(() => parse(sql)).not.toThrow();
}

/**
 * Assert that a mock query was called with valid SQL syntax, expected key phrases, and expected parameters
 *
 * @param {string[]} keyPhrases - Key phrases that should be present in the SQL
 * @param {any[]} expectedParams - Expected parameters array
 * @param {number} callIndex - Index of the query call to check for matching key phrases and expected parameters
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

   const [actualSql, actualParams] = mockPool.query.mock.calls[callIndex];

   // Validate that the SQL is syntactically correct
   assertValidSQL(actualSql);

   // Check that all expected key phrases are present in the actual SQL query
   keyPhrases.forEach(phrase => {
      expect(actualSql).toContain(phrase);
   });

   // Check that the actual parameters match the expected parameters
   expect(expectedParams).toEqual(actualParams || []);
}

/**
 * Arrange the UPDATE query structure for single or multiple fields and assert it was called
 * with the proper structure and expected parameters
 *
 * @param {string} tableName - Name of the table to update
 * @param {Record<string, any>} updates - Updates object (single or multiple fields)
 * @param {string} idField - ID field name (e.g., `"user_id"`, `"account_id"`)
 * @param {string} idValue - ID value
 * @param {() => Promise<boolean>} updateFn - Repository update function
 * @param {MockPool} mockPool - Mock pool instance
 */
export async function arrangeAndAssertUpdateQueries(
   tableName: string,
   updates: Record<string, any>,
   idField: string,
   idValue: string,
   updateFn: (id: string, updates: Record<string, any>) => Promise<boolean>,
   mockPool: MockPool
): Promise<void> {
   // Arrange a successful response to prevent the actual database call
   arrangeMockQuery([{ [idField]: idValue }], mockPool);

   // Execute the provided update function
   await updateFn(idValue, updates);

   // Get the fields and values in the order they appear in the updates object
   const fields: string[] = Object.keys(updates);
   const values: any[] = Object.values(updates);

   const keyPhrases: string[] = [
      `UPDATE ${tableName}`,
      "SET",
      "RETURNING"
   ];

   if (fields.length === 1) {
      // For a single field, the single parameter should be at index 1
      keyPhrases.push(`${fields[0]} = $1`);
   } else {
      // For multiple fields, they should be joined with commas
      const fieldAssignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
      keyPhrases.push(fieldAssignments);
   }

   // Add the WHERE clause with the expected parameter
   keyPhrases.push(`WHERE ${idField} = $${fields.length + 1}`);
   values.push(idValue);

   assertQueryCalledWithKeyPhrases(keyPhrases, values, 0, mockPool);
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
 * Assert object has specific properties and does not have others
 *
 * @param {Record<string, any>} obj - Object to validate
 * @param {string[]} requiredProperties - Properties that should exist
 * @param {string[]} excludedProperties - Properties that should not exist
 */
export function assertObjectProperties(obj: Record<string, any>, requiredProperties: string[], excludedProperties: string[] = []): void {
   requiredProperties.forEach(prop => expect(obj).toHaveProperty(prop));
   excludedProperties.forEach(prop => expect(obj).not.toHaveProperty(prop));
}