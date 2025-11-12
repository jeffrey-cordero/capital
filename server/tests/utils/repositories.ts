import { parse } from "pgsql-ast-parser";

/**
 * SQL statements intentionally excluded from syntax validation due to missing parse support
 */
const sqlValidationExceptions = new Set([
   "ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger",
   "ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger"
]);

/**
 * Mock database pool for repository unit tests
 */
export interface MockPool {
   query: jest.Mock;
   connect: jest.Mock;
   end: jest.Mock;
   on: jest.Mock;
}

/**
 * Mock database client for repository unit tests
 */
export interface MockClient {
   query: jest.Mock;
   release: jest.Mock;
   connect: jest.Mock;
}

/**
 * Mock database query result for repository unit tests
 */
export interface MockQueryResult {
   rows: any[];
   rowCount: number;
   command: string;
   oid: number;
   fields: any[];
}

/**
 * Repository update function with a single ID parameter
 */
type SingleIdUpdateFn = (id: string, updates: Record<string, any>) => Promise<boolean>;

/**
 * Repository update function with two ID parameters
 */
type DualIdUpdateFn = (id1: string, id2: string, updates: Record<string, any>) => Promise<boolean>;

/**
 * Create a mock database pool for repository unit tests
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
 * Create a mock database client for repository unit tests
 */
export function createMockClient(): MockClient {
   return {
      query: jest.fn().mockResolvedValue(createMockQueryResult()),
      release: jest.fn(),
      connect: jest.fn()
   };
}

/**
 * Create a mock query result for repository unit tests
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
 * Arranges the mock pool `query` to resolve with given rows
 *
 * @param {any[]} rows - Rows to return
 * @param {MockPool} mockPool - Mock pool
 */
export function arrangeMockQuery(rows: any[] = [], mockPool: MockPool): void {
   mockPool.query.mockResolvedValue(createMockQueryResult(rows));
}

/**
 * Arranges the mock pool `query` to reject with an error once
 *
 * @param {string} errorMessage - Error message
 * @param {MockPool} mockPool - Mock pool
 */
export function arrangeMockQueryError(errorMessage: string, mockPool: MockPool): void {
   mockPool.query.mockRejectedValueOnce(new Error(errorMessage));
}

/**
 * Arranges a sequence of results/errors for a transaction flow, where
 * if an error is expected, it should be the final step in the sequence
 *
 * @param {jest.MockedFunction} mockQuery - Mock `query` function
 * @param {Array<any | Error>} steps - Results or errors in order
 */
export function arrangeMockTransactionFlow(mockQuery: jest.MockedFunction<any>, steps: Array<any | Error>): void {
   for (const step of steps) {
      if (step instanceof Error) {
         mockQuery.mockRejectedValueOnce(step);
      } else {
         mockQuery.mockResolvedValueOnce(step || {});
      }
   }
}

/**
 * Resets all Jest mocks and normalizes database mocks to a shared
 * test-scoped mock client
 *
 * @param {MockPool} globalMockPool - Global mock pool
 * @param {MockPool} mockPool - Test-scoped mock pool for the current test
 * @param {MockClient} mockClient - Shared test-scoped mock client for the current test
 */
export function resetDatabaseMocks(globalMockPool: MockPool, mockPool: MockPool, mockClient: MockClient): void {
   jest.clearAllMocks();

   // Both query execution and pool connection mocks should point to the same test-scoped mock client
   mockPool.query = mockClient.query;
   mockPool.connect.mockResolvedValue(mockClient);

   // Global mock pool should point to the same test-scoped mock pool
   globalMockPool.query = mockPool.query;
   globalMockPool.connect = mockPool.connect;
}

/**
 * Asserts the test-scoped mock pool `query` was not called
 *
 * @param {MockPool} mockPool - Test-scoped mock pool for the current test
 */
export function assertQueryNotCalled(mockPool: MockPool): void {
   expect(mockPool.query).not.toHaveBeenCalled();
}

/**
 * Asserts a query result equals expected data
 *
 * @param {any} result - Actual query result
 * @param {any} expectedData - Expected data
 */
export function assertQueryResult(result: any, expectedData: any): void {
   expect(result).toEqual(expectedData);
}

/**
 * Asserts the client was released
 *
 * @param {MockClient} mockClient - Test-scoped mock client for the current test
 */
export function assertClientReleased(mockClient: MockClient): void {
   expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Asserts a rollback occurred with the expected number of statements
 *
 * @param {MockClient} mockClient - Test-scoped mock client for the current test
 * @param {number} expectedStatements - Statements executed excluding `BEGIN` and `ROLLBACK`
 */
export function assertTransactionRollback(mockClient: MockClient, expectedStatements: number): void {
   const mockClientQueries: any[] = mockClient.query.mock.calls;
   const totalQueries: number = mockClientQueries.length;

   // Assert that BEGIN, ROLLBACK, and the expected number of statements are in the sequence
   expect(totalQueries).toBe(expectedStatements + 2);

   // Assert that BEGIN is assigned to a proper isolation level
   expect(mockClientQueries[0][0]).toMatch(
      /^BEGIN TRANSACTION ISOLATION LEVEL (READ UNCOMMITTED|READ COMMITTED|REPEATABLE READ|SERIALIZABLE);?$/
   );
   expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT;");
   expect(mockClientQueries[totalQueries - 1][0]).toBe("ROLLBACK;");

   // Assert that the test-scoped mock client is released back to the mock pool
   assertClientReleased(mockClient);
}

/**
 * Asserts a transaction result equals expected data and the test-scoped
 * mock client is released back to the mock pool
 *
 * @param {any} result - Actual transaction result
 * @param {any} expectedData - Expected transaction result
 * @param {MockClient} mockClient - Test-scoped mock client for the current test
 */
export function assertTransactionResult(result: any, expectedData: any, mockClient: MockClient): void {
   assertQueryResult(result, expectedData);
   assertClientReleased(mockClient);
}

/**
 * Asserts SQL parses successfully with configured exceptions due to
 * missing parse support for certain SQL statements
 *
 * @param {string} sql - SQL to validate
 */
export function assertValidSQL(sql: string): void {
   if (sqlValidationExceptions.has(sql)) return;

   expect(() => parse(sql)).not.toThrow();
}

/**
 * Asserts a test-scoped mock query call had valid SQL, key phrases, and
 * parameters in the SQL query
 *
 * @param {string[]} keyPhrases - Required SQL fragments
 * @param {any[]} expectedParams - Expected parameters
 * @param {number} callIndex - Call index to check
 * @param {MockPool} mockPool - Test-scoped mock pool for the current test
 */
export function assertQueryCalledWithKeyPhrases(
   keyPhrases: string[],
   expectedParams: any[],
   callIndex: number,
   mockPool: MockPool
): void {
   // Assert that the specific call index exists
   expect(mockPool.query.mock.calls.length).toBeGreaterThanOrEqual(callIndex + 1);

   const [actualSql, actualParams] = mockPool.query.mock.calls[callIndex];

   // Validate that the SQL is syntactically correct with configured exceptions
   assertValidSQL(actualSql);

   // Assert that all expected key phrases are present in the actual SQL query
   keyPhrases.forEach(phrase => {
      expect(actualSql).toContain(phrase);
   });

   // Assert that the actual parameters match the expected parameters in the SQL query
   expect(expectedParams).toEqual(actualParams || []);
}

/**
 * Arranges and asserts an UPDATE query (single or multiple fields) in the SQL query
 *
 * @param {string} tableName - Table name
 * @param {Record<string, any>} updates - Fields to update
 * @param {string} idField - ID field name
 * @param {string} idValue - ID value
 * @param {SingleIdUpdateFn | DualIdUpdateFn} updateFn - Repository update function
 * @param {MockPool} mockPool - Test-scoped mock pool for the current test
 * @param {string} [secondIdField] - Optional second ID field name for composite WHERE clauses
 * @param {string} [secondIdValue] - Optional second ID value for composite WHERE clauses
 * @param {readonly string[]} [allowedFields] - Optional array of allowed field names to filter updates through
 */
export async function arrangeAndAssertUpdateQueries(
   tableName: string,
   updates: Record<string, any>,
   idField: string,
   idValue: string,
   updateFn: SingleIdUpdateFn | DualIdUpdateFn,
   mockPool: MockPool,
   secondIdField?: string,
   secondIdValue?: string,
   allowedFields?: readonly string[]
): Promise<void> {
   // Determine which ID field to use for mock response
   const mockIdField = secondIdField || idField;
   const mockIdValue = secondIdValue || idValue;

   // Arrange a successful response to the database query call
   arrangeMockQuery([{ [mockIdField]: mockIdValue }], mockPool);

   // Execute the provided update function to update the database
   if (secondIdField && secondIdValue) {
      await (updateFn as DualIdUpdateFn)(idValue, secondIdValue, updates);
   } else {
      await (updateFn as SingleIdUpdateFn)(idValue, updates);
   }

   // Get fields and values by filtering through the allowed fields or using all of the keys from the updates object
   let param = 1;
   const values: any[] = [];
   const fields: string[] = [];

   (allowedFields || Object.keys(updates)).forEach((field) => {
      if (field in updates) {
         fields.push(`${field} = $${param}`);
         values.push(updates[field]);
         param++;
      }
   });

   const keyPhrases: string[] = [`UPDATE ${tableName}`, "SET", "RETURNING"];

   if (fields.length === 1) {
      // For a single field, the parameter should be at index 1 in the SQL query
      keyPhrases.push(`${fields[0]}`);
   } else {
      // For multiple fields, join with commas
      keyPhrases.push(fields.join(", "));
   }

   // Add the WHERE clause with the expected parameter(s)
   keyPhrases.push(`WHERE ${idField} = $${param}`);
   values.push(idValue);
   param++;

   if (secondIdField && secondIdValue) {
      keyPhrases.push(`AND ${secondIdField} = $${param}`);
      values.push(secondIdValue);
   }

   assertQueryCalledWithKeyPhrases(keyPhrases, values, 0, mockPool);
}

/**
 * Asserts a repository function throws the expected error and logs the stack
 *
 * @param {() => Promise<any>} repositoryFunction - Repository function under test
 * @param {string} expectedErrorMessage - Expected error message
 */
export async function assertRepositoryThrows(
   repositoryFunction: () => Promise<any>,
   expectedErrorMessage: string
): Promise<void> {
   try {
      await repositoryFunction();
      throw new Error(`Expected repository to throw "${expectedErrorMessage}" but it succeeded instead...`);
   } catch (error: any) {
      expect(error.message).toBe(expectedErrorMessage);
   }
}

/**
 * Asserts an object has required properties and omits excluded ones
 *
 * @param {Record<string, any>} obj - Object to assert properties of
 * @param {string[]} requiredProperties - Properties that must exist
 * @param {string[]} [excludedProperties] - Properties that must not exist in the object
 */
export function assertObjectProperties(obj: Record<string, any>, requiredProperties: string[], excludedProperties: string[] = []): void {
   requiredProperties.forEach(prop => expect(obj).toHaveProperty(prop));
   excludedProperties.forEach(prop => expect(obj).not.toHaveProperty(prop));
}