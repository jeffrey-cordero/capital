/**
 * Mock database pool for testing
 */
export const mockPool = {
   query: jest.fn(),
   connect: jest.fn(),
   end: jest.fn(),
   on: jest.fn()
};

/**
 * Mock database client for testing
 */
export const mockClient = {
   query: jest.fn(),
   release: jest.fn(),
   connect: jest.fn()
};

/**
 * Helper function to mock client query with rejected value once
 *
 * @param {Error | string} error - Error to reject with
 */
export function mockClientQueryRejectedOnce(error: Error | string): void {
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
 * Setup mock pool query to return specific data
 *
 * @param {any[]} rows - Array of rows to return
 */
export function setupMockQuery(rows: any[] = []): void {
   mockPool.query.mockResolvedValue(createMockQueryResult(rows));
}

/**
 * Setup mock pool query to throw an error
 *
 * @param {Error | string} error - Error to throw
 */
export function setupMockQueryError(error: Error | string): void {
   const errorObj = typeof error === "string" ? new Error(error) : error;
   mockPool.query.mockRejectedValue(errorObj);
}

/**
 * Setup mock transaction to fail at specific stage
 *
 * @param {Error | string} error - Error to throw
 * @param {'BEGIN' | 'execute' | 'COMMIT'} [atStage] - Stage where error should occur (default: 'execute')
 */
export function setupMockTransactionError(error: Error | string, atStage: "BEGIN" | "execute" | "COMMIT" = "execute"): void {
   const errorObj = typeof error === "string" ? new Error(error) : error;
   (mockPool.connect).mockResolvedValue(mockClient);

   const mockQuery = mockClient.query;

   switch (atStage) {
      case "BEGIN":
         mockQuery.mockRejectedValueOnce(errorObj);
         break;
      case "execute":
         mockQuery.mockResolvedValueOnce({}) // BEGIN
            .mockRejectedValueOnce(errorObj); // Execute
         break;
      case "COMMIT":
         mockQuery.mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({}) // Execute
            .mockRejectedValueOnce(errorObj); // COMMIT
         break;
   }
}

/**
 * Reset all database mocks
 */
export function resetDatabaseMocks(): void {
   jest.clearAllMocks();
   (mockPool.query).mockClear();
   (mockPool.connect).mockClear();
   (mockClient.query).mockClear();
   (mockClient.release).mockClear();
}

/**
 * Assert that query was not called
 */
export function assertQueryNotCalled(): void {
   expect(mockPool.query).not.toHaveBeenCalled();
}

/**
 * Assert that client was released
*/
export function assertClientReleased(): void {
   expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Assert that ROLLBACK was called
 */
export function assertTransactionRollback(): void {
   expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT;");
   expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK;");
   assertClientReleased();
}

/**
 * Assert query result matches expected data
 *
 * @param {any} result - Actual query result
 * @param {any} expectedData - Expected data
 */
export function assertQueryResult(result: any, expectedData: any): void {
   expect(result).toEqual(expectedData);
}

/**
 * Assert query result matches expected data and client was released (for transaction-based operations)
 *
 * @param {any} result - Actual query result
 * @param {any} expectedData - Expected data
 */
export function assertTransactionResult(result: any, expectedData: any): void {
   expect(result).toEqual(expectedData);
   assertClientReleased();
}

/**
 * Assert that query was called with SQL containing key phrases and exact parameters
 * This is more robust against formatting changes while still validating the query structure
 *
 * @param {string[]} keyPhrases - Key phrases that should be present in the SQL
 * @param {any[]} expectedParams - Expected parameters array
 * @param {number} [callIndex] - Which call to check (default: 0)
 * @param {any} [mockQuery] - Mock query object to check (default: mockPool.query)
 */
export function assertQueryCalledWithKeyPhrases(
   keyPhrases: string[],
   expectedParams: any[],
   callIndex: number = 0,
   mockQuery: any = mockPool.query
): void {
   // Ensure the specific call index exists
   expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(callIndex + 1);

   const call = mockQuery.mock.calls[callIndex];
   const actualSql = call[0];
   const actualParams = call[1] || [];

   // Check that all key phrases are present in the SQL
   keyPhrases.forEach(phrase => {
      expect(actualSql).toContain(phrase);
   });

   // Check exact parameter match
   expect(actualParams).toEqual(expectedParams);
}

/**
 * Test UPDATE query formation for single or multiple fields - pure SQL structure validation
 *
 * @param {string} tableName - Name of the table to update
 * @param {Record<string, any>} updates - Updates object (single or multiple fields)
 * @param {string} idField - ID field name (e.g., "user_id", "account_id")
 * @param {string} idValue - ID value
 * @param {Function} updateFn - Repository update function
 * @param {any} [mockQuery] - Mock query object to check (default: mockPool.query)
 */
export async function testUpdateQueryFormation(
   tableName: string,
   updates: Record<string, any>,
   idField: string,
   idValue: string,
   updateFn: (_id: string, _updates: Record<string, any>) => Promise<boolean>,
   mockQuery: jest.Mock = mockPool.query
): Promise<void> {
   // Mock successful response to prevent actual database call
   setupMockQuery([{ [idField]: idValue }]);

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
   assertQueryCalledWithKeyPhrases(keyPhrases, expectedParams, 0, mockQuery);
}

/**
 * Setup mock client for transaction error scenarios
 *
 * @param {string} errorMessage - Error message to throw
 * @param {string} stage - Which stage should fail
 */
export function setupTransactionError(errorMessage: string, stage: string): void {
   const mockQuery = mockClient.query;
   mockQuery.mockClear();

   if (stage === "BEGIN") {
      mockQuery.mockRejectedValueOnce(new Error(errorMessage));
   } else if (stage === "COMMIT") {
      mockQuery.mockResolvedValueOnce({}); // BEGIN succeeds
      mockQuery.mockRejectedValueOnce(new Error(errorMessage)); // COMMIT fails
   } else {
      // Default: fail at execution stage
      mockQuery.mockResolvedValueOnce({}); // BEGIN succeeds
      mockQuery.mockRejectedValueOnce(new Error(errorMessage)); // Execution fails
   }
}

/**
 * Test repository function with database error
 *
 * @param {Function} repositoryFunction - Repository function to test
 * @param {string} errorMessage - Expected error message
 * @returns {Promise<void>}
 */
export async function testRepositoryDatabaseError(
   repositoryFunction: () => Promise<any>,
   errorMessage: string
): Promise<void> {
   setupMockQueryError(errorMessage);

   await expect(repositoryFunction())
      .rejects.toThrow(errorMessage);
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

/**
 * Setup creation transaction flow with configurable table and ID field
 *
 * @param {string} tableName - Name of the table to create record in
 * @param {string} idField - ID field name (e.g., "user_id", "account_id")
 * @param {string} idValue - Expected ID value
 * @param {boolean} shouldFail - Whether creation should fail
 * @param {string} failStage - Which stage should fail (optional)
 * @param {any} [mockQuery] - Mock query object to configure (default: mockClient.query)
 */
export function setupCreationTransaction(
   tableName: string,
   idField: string,
   idValue: string,
   shouldFail: boolean = false,
   failStage?: string,
   mockQuery: jest.Mock = mockClient.query
): void {
   const stages = [
      {}, // BEGIN
      { rows: [{ [idField]: idValue }] }, // INSERT
      {} // COMMIT
   ];

   mockQuery.mockClear();

   stages.forEach((stage, index) => {
      if (shouldFail && failStage && index === stages.findIndex(s => s === failStage)) {
         mockQuery.mockRejectedValueOnce(new Error(`${failStage} failed`));
      } else {
         mockQuery.mockResolvedValueOnce(stage);
      }
   });
}