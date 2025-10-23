/**
 * Mock database pool for testing
 */
export const mockPool = {
   query: jest.fn() as jest.Mock,
   connect: jest.fn() as jest.Mock,
   end: jest.fn() as jest.Mock,
   on: jest.fn() as jest.Mock
};

/**
 * Mock database client for testing
 */
export const mockClient = {
   query: jest.fn() as jest.Mock,
   release: jest.fn() as jest.Mock,
   connect: jest.fn() as jest.Mock
};

/**
 * Helper function to mock client query with resolved value
 *
 * @param {any} result - Result to resolve with
 */
export function mockClientQueryResolved(result: any): void {
   mockClient.query.mockResolvedValue(result);
}

/**
 * Helper function to mock client query with rejected value
 *
 * @param {Error | string} error - Error to reject with
 */
export function mockClientQueryRejected(error: Error | string): void {
   const errorObj = typeof error === "string" ? new Error(error) : error;
   mockClient.query.mockRejectedValue(errorObj);
}

/**
 * Helper function to mock client query with resolved value once
 *
 * @param {any} result - Result to resolve with
 */
export function mockClientQueryResolvedOnce(result: any): void {
   mockClient.query.mockResolvedValueOnce(result);
}

/**
 * Helper function to mock client query for user creation transaction flow
 *
 * @param {any} result - Result to resolve with for user creation
 */
export function mockClientQueryForUserCreation(result: any): void {
   mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce(result) // User INSERT
      .mockResolvedValueOnce({}); // COMMIT
}

/**
 * Helper function to mock client query for user deletion transaction flow
 *
 * @param {any} result - Result to resolve with for user deletion
 */
export function mockClientQueryForUserDeletion(result: any): void {
   mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // Disable trigger
      .mockResolvedValueOnce(result) // Deletion
      .mockResolvedValueOnce({}) // Enable trigger
      .mockResolvedValueOnce({}); // COMMIT
}

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
export const createMockQueryResult = (rows: any[] = []) => ({
   rows,
   rowCount: rows.length,
   command: "SELECT",
   oid: 0,
   fields: []
});

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
 * Setup mock transaction flow
 *
 * @param {any} result - Result to return from transaction execution
 * @param {boolean} [shouldFail] - Whether transaction should fail (default: false)
 */
export function setupMockTransaction(result: any, shouldFail: boolean = false): void {
   (mockPool.connect).mockResolvedValue(mockClient);

   if (shouldFail) {
      (mockClient.query)
         .mockResolvedValueOnce({}) // BEGIN
         .mockRejectedValueOnce(new Error("Transaction failed")); // Execute
   } else {
      (mockClient.query)
         .mockResolvedValueOnce({}) // BEGIN
         .mockResolvedValueOnce(result) // Execute
         .mockResolvedValueOnce({}); // COMMIT
   }
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
 * Assert that query was called with expected SQL and parameters
 *
 * @param {string} expectedSql - Expected SQL query string
 * @param {any[]} expectedParams - Expected parameters array
 * @param {number} [callIndex] - Which call to check (default: 0)
 */
export function assertQueryCalled(expectedSql: string, expectedParams: any[], callIndex: number = 0): void {
   const mockQuery = mockPool.query;
   expect(mockQuery).toHaveBeenCalledTimes(callIndex + 1);
   expect(mockQuery).toHaveBeenNthCalledWith(callIndex + 1, expectedSql, expectedParams);
}

/**
 * Assert that query was not called
 */
export function assertQueryNotCalled(): void {
   expect(mockPool.query).not.toHaveBeenCalled();
}

/**
 * Assert transaction flow (BEGIN, execution, COMMIT)
 *
 * @param {string[]} expectedStages - Expected transaction stages
 */
export function assertTransactionFlow(expectedStages: string[]): void {
   const mockQuery = mockClient.query;
   expect(mockQuery).toHaveBeenCalledTimes(expectedStages.length);

   expectedStages.forEach((stage, index) => {
      expect(mockQuery).toHaveBeenNthCalledWith(index + 1, stage);
   });
}

/**
 * Assert that ROLLBACK was called
 */
export function assertTransactionRollback(): void {
   expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK;");
}

/**
 * Assert that client was released
 */
export function assertClientReleased(): void {
   expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Assert that client was not released
 */
export function assertClientNotReleased(): void {
   expect(mockClient.release).not.toHaveBeenCalled();
}

/**
 * Assert user query result matches expected data
 *
 * @param {any} result - Actual query result
 * @param {any} expectedUser - Expected user data
 */
export function assertUserQueryResult(result: any, expectedUser: any): void {
   if (result && result.rows !== undefined) {
      // For repository functions that return rows directly
      expect(result.rows).toEqual(expectedUser);
   } else {
      // For functions that return the full query result
      expect(result).toEqual(expectedUser);
   }
}

/**
 * Assert conflict check behavior with exact SQL and parameters
 *
 * @param {string} username - Expected username parameter
 * @param {string} email - Expected email parameter
 * @param {string} [userId] - Expected user_id parameter (optional)
 */
export function assertConflictCheckBehavior(username: string, email: string, userId?: string): void {
   const expectedSql = `
      SELECT user_id, username, email
      FROM users
      WHERE (username_normalized = $1 OR email_normalized = $2) AND (user_id IS DISTINCT FROM $3);
   `;
   const expectedParams = [username.toLowerCase().trim(), email.toLowerCase().trim(), userId];
   assertQueryCalled(expectedSql, expectedParams);
}

/**
 * Assert user creation flow with transaction and category creation
 *
 * @param {any} client - Mock client object
 * @param {any} userData - Expected user data
 * @param {any[]} categoryParams - Expected category creation parameters
 */
export function assertUserCreationFlow(client: any, userData: any, categoryParams: any[]): void {
   // Verify transaction flow
   assertTransactionFlow([
      "BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;",
      expect.stringContaining("INSERT INTO users"),
      expect.stringContaining("INSERT INTO budget_categories"),
      expect.stringContaining("INSERT INTO budget_categories"),
      "COMMIT;"
   ]);

   // Verify user creation query
   const userInsertSql = `
         INSERT INTO users (username, name, password, email, birthday)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id;
      `;
   expect(client.query).toHaveBeenCalledWith(userInsertSql, [
      userData.username,
      userData.name,
      userData.password,
      userData.email,
      userData.birthday
   ]);

   // Verify category creation calls
   expect(categoryParams).toHaveLength(2);
}

/**
 * Assert user update flow with dynamic query construction
 *
 * @param {string} userId - Expected user ID
 * @param {any} updates - Expected updates object
 * @param {any[]} expectedParams - Expected query parameters
 */
export function assertUserUpdateFlow(userId: string, updates: any, expectedParams: any[]): void {
   const updateFields = Object.keys(updates).map((field, index) => `${field} = $${index + 1}`);
   const expectedSql = `
      UPDATE users
      SET ${updateFields.join(", ")}
      WHERE user_id = $${expectedParams.length}
      RETURNING user_id;
   `;

   assertQueryCalled(expectedSql, expectedParams);
}

/**
 * Assert user deletion flow with trigger operations
 *
 * @param {string} userId - Expected user ID
 * @param {boolean} triggerOperations - Whether trigger operations should be verified
 */
export function assertUserDeletionFlow(userId: string, triggerOperations: boolean = true): void {
   const mockQuery = mockClient.query;

   if (triggerOperations) {
      // Verify trigger disable
      expect(mockQuery).toHaveBeenCalledWith("ALTER TABLE budget_categories DISABLE TRIGGER prevent_main_budget_category_modifications_trigger");

      // Verify deletion query
      const deleteSql = `
         DELETE FROM users
         WHERE user_id = $1;
      `;
      expect(mockQuery).toHaveBeenCalledWith(deleteSql, [userId]);

      // Verify trigger enable
      expect(mockQuery).toHaveBeenCalledWith("ALTER TABLE budget_categories ENABLE TRIGGER prevent_main_budget_category_modifications_trigger");
   }

   // Verify SERIALIZABLE isolation level
   expect(mockQuery).toHaveBeenCalledWith("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;");
}

/**
 * Test single field update with modular verification
 *
 * @param {string} field - Field name to update
 * @param {any} value - Value to set
 * @param {string} userId - User ID to update
 * @param {Function} updateFn - Repository update function
 */
export async function testSingleFieldUpdate(field: string, value: any, userId: string, updateFn: (userId: string, updates: any) => Promise<boolean>): Promise<void> {
   const updates = { [field]: value };
   setupMockQuery([{ user_id: userId }]);

   const result: boolean = await updateFn(userId, updates);

   const expectedSql = `
      UPDATE users
      SET ${field} = $1
      WHERE user_id = $2
      RETURNING user_id;
   `;
   const expectedParams = [value, userId];
   assertQueryCalled(expectedSql, expectedParams);
   expect(result).toBe(true);
}

/**
 * Test multiple field update with modular verification
 *
 * @param {any} updates - Updates object with multiple fields
 * @param {string} userId - User ID to update
 * @param {Function} updateFn - Repository update function
 */
export async function testMultipleFieldUpdate(updates: any, userId: string, updateFn: (userId: string, updates: any) => Promise<boolean>): Promise<void> {
   setupMockQuery([{ user_id: userId }]);

   const result: boolean = await updateFn(userId, updates);

   const fields = Object.keys(updates);
   const values = Object.values(updates);
   const updateFields = fields.map((field, index) => `${field} = $${index + 1}`);

   const expectedSql = `
      UPDATE users
      SET ${updateFields.join(", ")}
      WHERE user_id = $${values.length + 1}
      RETURNING user_id;
   `;
   const expectedParams = [...values, userId];
   assertQueryCalled(expectedSql, expectedParams);
   expect(result).toBe(true);
}

/**
 * Test update result verification (true/false based on user existence)
 *
 * @param {any} updates - Updates object
 * @param {string} userId - User ID to update
 * @param {Function} updateFn - Repository update function
 * @param {boolean} userExists - Whether user should exist (affects expected result)
 */
export async function testUpdateResult(updates: any, userId: string, updateFn: (userId: string, updates: any) => Promise<boolean>, userExists: boolean): Promise<void> {
   const mockResult = userExists ? [{ user_id: userId }] : [];
   setupMockQuery(mockResult);

   const result: boolean = await updateFn(userId, updates);

   expect(result).toBe(userExists);
}

/**
 * Setup mock client for transaction operations with specific stages
 *
 * @param {Array} stages - Array of mock responses for each stage
 * @param {boolean} shouldFail - Whether the transaction should fail
 * @param {string} failStage - Which stage should fail (optional)
 */
export function setupMockTransactionStages(stages: any[], shouldFail: boolean = false, failStage?: string): void {
   const mockQuery = mockClient.query;
   mockQuery.mockClear();

   stages.forEach((stage, index) => {
      if (shouldFail && failStage && index === stages.findIndex(s => s === failStage)) {
         mockQuery.mockRejectedValueOnce(new Error(`${failStage} failed`));
      } else {
         mockQuery.mockResolvedValueOnce(stage);
      }
   });
}

/**
 * Setup mock client for user creation transaction flow
 *
 * @param {string} userId - Expected user ID
 * @param {boolean} shouldFail - Whether creation should fail
 * @param {string} failStage - Which stage should fail (optional)
 */
export function setupUserCreationTransaction(userId: string, shouldFail: boolean = false, failStage?: string): void {
   const stages = [
      {}, // BEGIN
      { rows: [{ user_id: userId }] }, // User INSERT
      {} // COMMIT
   ];

   setupMockTransactionStages(stages, shouldFail, failStage);
}

/**
 * Setup mock client for user deletion transaction flow
 *
 * @param {boolean} shouldFail - Whether deletion should fail
 * @param {string} failStage - Which stage should fail (optional)
 */
export function setupUserDeletionTransaction(shouldFail: boolean = false, failStage?: string): void {
   const stages = [
      {}, // BEGIN
      {}, // Disable trigger
      { rowCount: 1 }, // Deletion
      {}, // Enable trigger
      {} // COMMIT
   ];

   setupMockTransactionStages(stages, shouldFail, failStage);
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
 * Setup mock for user creation with category creation error
 *
 * @param {string} userId - Expected user ID
 * @param {string} errorMessage - Error message for category creation failure
 */
export function setupUserCreationWithCategoryError(userId: string, _errorMessage: string): void {
   setupUserCreationTransaction(userId);
   // Note: budgetsRepository.createCategory mock should be set up in the test file
   // This helper just documents the expected setup pattern
}

/**
 * Setup mock for user creation with database error
 *
 * @param {string} errorMessage - Error message for database failure
 */
export function setupUserCreationWithDatabaseError(errorMessage: string): void {
   setupTransactionError(errorMessage, "user_insert");
}

/**
 * Setup mock for user deletion with database error
 *
 * @param {string} errorMessage - Error message for database failure
 */
export function setupUserDeletionWithDatabaseError(errorMessage: string): void {
   setupMockQueryError(errorMessage);
}

/**
 * Setup mock for user update with database error
 *
 * @param {string} errorMessage - Error message for database failure
 */
export function setupUserUpdateWithDatabaseError(errorMessage: string): void {
   setupMockQueryError(errorMessage);
}

/**
 * Setup mock for user lookup with database error
 *
 * @param {string} errorMessage - Error message for database failure
 */
export function setupUserLookupWithDatabaseError(errorMessage: string): void {
   setupMockQueryError(errorMessage);
}

/**
 * Assert user object has specific properties and not others
 *
 * @param {any} user - User object to validate
 * @param {string[]} requiredProperties - Properties that should exist
 * @param {string[]} excludedProperties - Properties that should not exist
 */
export function assertUserProperties(user: any, requiredProperties: string[], excludedProperties: string[] = []): void {
   requiredProperties.forEach(prop => {
      expect(user).toHaveProperty(prop);
   });

   excludedProperties.forEach(prop => {
      expect(user).not.toHaveProperty(prop);
   });
}

/**
 * Assert user has only basic fields (user_id, username, password)
 *
 * @param {any} user - User object to validate
 */
export function assertBasicUserFields(user: any): void {
   assertUserProperties(user, ["user_id", "username", "password"], ["email", "name", "birthday"]);
}

/**
 * Assert user has all complete fields
 *
 * @param {any} user - User object to validate
 */
export function assertCompleteUserFields(user: any): void {
   assertUserProperties(user, ["user_id", "username", "password", "email", "name", "birthday"]);
}

/**
 * Setup mock client for successful user deletion transaction
 *
 * @param {number} rowCount - Number of rows affected by deletion
 */
export function setupUserDeletionTransactionSuccess(rowCount: number = 1): void {
   (mockClient.query as any)
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // Disable trigger
      .mockResolvedValueOnce({ rowCount }) // Deletion
      .mockResolvedValueOnce({}) // Enable trigger
      .mockResolvedValueOnce({}); // COMMIT
}

/**
 * Setup mock client for user deletion transaction with error at specific stage
 *
 * @param {string} errorMessage - Error message to throw
 * @param {string} failStage - Stage where error should occur ("deletion", "trigger_disable", "trigger_enable")
 */
export function setupUserDeletionTransactionError(errorMessage: string, failStage: string): void {
   const mockQuery = (mockClient.query as any);

   switch (failStage) {
      case "trigger_disable":
         mockQuery.mockResolvedValueOnce({}) // BEGIN
            .mockRejectedValueOnce(new Error(errorMessage) as any); // Disable trigger
         break;
      case "deletion":
         mockQuery.mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({}) // Disable trigger
            .mockRejectedValueOnce(new Error(errorMessage) as any); // Deletion
         break;
      case "trigger_enable":
         mockQuery.mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({}) // Disable trigger
            .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Deletion
            .mockRejectedValueOnce(new Error(errorMessage) as any); // Enable trigger
         break;
      default:
         throw new Error(`Unknown fail stage: ${failStage}`);
   }
}