import { MockedServiceFunction } from "@/tests/utils/controllers";

/**
 * Mocked repository function type
 *
 * @template T - The type of the repository function
 * @returns {jest.MockedFunction<T>} The mocked repository function
 */
export type MockedRepositoryFunction<T extends (..._args: unknown[]) => unknown> = jest.MockedFunction<T>;

/**
 * Helper function to setup a mock repository function with successful data return
 *
 * @param {any} repositoryModule - The repository module to mock
 * @param {string} methodName - The method name of the repository to mock
 * @param {any} data - Data to return from the repository function
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} The mocked repository function
 */
export function setupMockRepositorySuccess(
   repositoryModule: any,
   methodName: string,
   data: any
): MockedRepositoryFunction<typeof repositoryModule[typeof methodName]> {
   const mockFunction = repositoryModule[methodName] as MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>;
   mockFunction.mockResolvedValue(data);
   return mockFunction;
}

/**
 * Helper function to setup a mock repository function that returns null (not found)
 *
 * @param {any} repositoryModule - The repository module to mock
 * @param {string} methodName - The method name of the repository to mock
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} The mocked repository function
 */
export function setupMockRepositoryNull(
   repositoryModule: any,
   methodName: string
): MockedRepositoryFunction<typeof repositoryModule[typeof methodName]> {
   const mockFunction = repositoryModule[methodName] as MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>;
   mockFunction.mockResolvedValue(null);
   return mockFunction;
}

/**
 * Helper function to setup a mock repository function that returns empty array
 *
 * @param {any} repositoryModule - The repository module to mock
 * @param {string} methodName - The method name of the repository to mock
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} The mocked repository function
 */
export function setupMockRepositoryEmpty(
   repositoryModule: any,
   methodName: string
): MockedRepositoryFunction<typeof repositoryModule[typeof methodName]> {
   const mockFunction = repositoryModule[methodName] as MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>;
   mockFunction.mockResolvedValue([]);
   return mockFunction;
}

/**
 * Helper function to setup a mock repository function that throws a database error
 *
 * @param {any} repositoryModule - The repository module to mock
 * @param {string} methodName - The method name of the repository to mock
 * @param {Error} error - Database error to throw
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} The mocked repository function
 */
export function setupMockRepositoryError(
   repositoryModule: any,
   methodName: string,
   error: Error
): MockedRepositoryFunction<typeof repositoryModule[typeof methodName]> {
   const mockFunction = repositoryModule[methodName] as MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>;
   mockFunction.mockRejectedValue(error);
   return mockFunction;
}

/**
 * Helper function to setup a mock cache function with successful hit
 *
 * @param {any} cacheModule - The cache module to mock
 * @param {string} methodName - The method name of the cache function to mock
 * @param {string} data - Cached data to return
 * @returns {MockedServiceFunction<typeof cacheModule[typeof methodName]>} The mocked cache function
 */
export function setupMockCacheHit(
   cacheModule: any,
   methodName: string,
   data: string
): MockedServiceFunction<typeof cacheModule[typeof methodName]> {
   const mockFunction = cacheModule[methodName] as MockedServiceFunction<typeof cacheModule[typeof methodName]>;
   mockFunction.mockResolvedValue(data);
   return mockFunction;
}

/**
 * Helper function to setup a mock cache function with cache miss (null return)
 *
 * @param {any} cacheModule - The cache module to mock
 * @param {string} methodName - The method name of the cache function to mock
 * @returns {MockedServiceFunction<typeof cacheModule[typeof methodName]>} The mocked cache function
 */
export function setupMockCacheMiss(
   cacheModule: any,
   methodName: string
): MockedServiceFunction<typeof cacheModule[typeof methodName]> {
   const mockFunction = cacheModule[methodName] as MockedServiceFunction<typeof cacheModule[typeof methodName]>;
   mockFunction.mockResolvedValue(null);
   return mockFunction;
}

/**
 * Helper function to setup a mock cache function that throws a cache error
 *
 * @param {any} cacheModule - The cache module to mock
 * @param {string} methodName - The method name of the cache function to mock
 * @param {Error} error - Cache error to throw
 * @returns {MockedServiceFunction<typeof cacheModule[typeof methodName]>} The mocked cache function
 */
export function setupMockCacheError(
   cacheModule: any,
   methodName: string,
   error: Error
): MockedServiceFunction<typeof cacheModule[typeof methodName]> {
   const mockFunction = cacheModule[methodName] as MockedServiceFunction<typeof cacheModule[typeof methodName]>;
   mockFunction.mockRejectedValue(error);
   return mockFunction;
}

/**
 * Tests Redis error scenarios with logging verification
 *
 * @param {MockedServiceFunction<any>} mockCacheFunction - The mocked cache function
 * @param {string} errorMessage - Expected error message
 * @param {string} statusCode - Expected error status code, where ECONNREFUSED is a Redis connection error always logged to the console
 */
export function testRedisErrorScenario(
   mockCacheFunction: MockedServiceFunction<any>,
   errorMessage: string,
   statusCode: "ENOMEM" | "ECONNREFUSED" = "ENOMEM"
): void {
   // Mock Redis error
   const redisError = new Error(errorMessage);
   (redisError as any).code = statusCode;
   redisError.stack = `Error: ${errorMessage}\n    at Redis connection`;

   mockCacheFunction.mockRejectedValue(redisError);
}

/**
 * Tests database error scenarios with logging verification
 *
 * @param {MockedRepositoryFunction<any>} mockRepositoryFunction - The mocked repository function
 * @param {string} errorMessage - Expected error message
 */
export function testDatabaseErrorScenario(
   mockRepositoryFunction: MockedRepositoryFunction<any>,
   errorMessage: string
): void {
   // Mock database error
   const dbError = new Error(errorMessage);
   dbError.stack = `Error: ${errorMessage}\n    at Database query`;

   mockRepositoryFunction.mockRejectedValue(dbError);
}

/**
 * Asserts that a service function properly handled a success response
 *
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function
 * @param {any[]} expectedArgs - Expected arguments passed to the service function
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {any} expectedData - Expected data in the response
 */
export function assertServiceSuccessResponse(
   mockServiceFunction: MockedServiceFunction<any>,
   expectedArgs: any[],
   expectedStatusCode: number,
   expectedData: any
): void {
   // Verify the service function was called with the expected arguments
   expect(mockServiceFunction).toHaveBeenCalledWith(...expectedArgs);

   // Verify the service function returned the expected response
   expect(mockServiceFunction).toHaveReturnedWith(
      expect.objectContaining({
         statusCode: expectedStatusCode,
         data: expectedData
      })
   );
}

/**
 * Asserts that a service function properly handled a validation error response
 *
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function
 * @param {any[]} expectedArgs - Expected arguments passed to the service function
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {Record<string, string>} expectedErrors - Expected error object
 */
export function assertServiceValidationErrorResponse(
   mockServiceFunction: MockedServiceFunction<any>,
   expectedArgs: any[],
   expectedStatusCode: number,
   expectedErrors: Record<string, string>
): void {
   // Verify the service function was called with the expected arguments
   expect(mockServiceFunction).toHaveBeenCalledWith(...expectedArgs);

   // Verify the service function returned the expected error response
   expect(mockServiceFunction).toHaveReturnedWith(
      expect.objectContaining({
         statusCode: expectedStatusCode,
         errors: expectedErrors
      })
   );
}

/**
 * Asserts that a service function properly handled an error by throwing it
 *
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function
 * @param {any[]} expectedArgs - Expected arguments passed to the service function
 * @param {Error} expectedError - Expected error that should be thrown
 */
export function assertServiceErrorThrown(
   mockServiceFunction: MockedServiceFunction<any>,
   expectedArgs: any[],
   expectedError: Error
): void {
   // Verify the service function was called with the expected arguments
   expect(mockServiceFunction).toHaveBeenCalledWith(...expectedArgs);

   // Verify the service function throws the expected error
   expect(mockServiceFunction()).rejects.toThrow(expectedError);
}

/**
 * Asserts cache hit behavior - cache was called, repository was not called, cache was not set
 *
 * @param {any} cacheModule - Cache module mock
 * @param {string} cacheMethod - Cache method name (e.g., "getCacheValue")
 * @param {any} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name (e.g., "findByUserId")
 * @param {string} cacheKey - Expected cache key
 */
export function assertCacheHitBehavior(
   cacheModule: any,
   cacheMethod: string,
   repositoryModule: any,
   repositoryMethod: string,
   cacheKey: string
): void {
   expect(cacheModule[cacheMethod]).toHaveBeenCalledWith(cacheKey);
   expect(repositoryModule[repositoryMethod]).not.toHaveBeenCalled();
   expect(cacheModule.setCacheValue).not.toHaveBeenCalled();
}

/**
 * Asserts cache miss behavior - cache was called, repository was called, cache was set
 *
 * @param {any} cacheModule - Cache module mock
 * @param {string} cacheMethod - Cache method name (e.g., "getCacheValue")
 * @param {any} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name (e.g., "findByUserId")
 * @param {string} cacheKey - Expected cache key
 * @param {string} repositoryParam - Expected parameter for repository call
 * @param {any} expectedData - Expected data to be cached
 * @param {number} cacheDuration - Expected cache duration in seconds
 */
export function assertCacheMissBehavior(
   cacheModule: any,
   cacheMethod: string,
   repositoryModule: any,
   repositoryMethod: string,
   cacheKey: string,
   repositoryParam: string,
   expectedData: any,
   cacheDuration: number
): void {
   expect(cacheModule[cacheMethod]).toHaveBeenCalledWith(cacheKey);
   expect(repositoryModule[repositoryMethod]).toHaveBeenCalledWith(repositoryParam);
   expect(cacheModule.setCacheValue).toHaveBeenCalledWith(
      cacheKey,
      cacheDuration,
      JSON.stringify(expectedData)
   );
}

/**
 * Asserts cache error fallback behavior - cache was called, repository was called, cache was set
 *
 * @param {any} redis - Redis module mock
 * @param {any} userRepository - User repository module mock
 * @param {any} logger - Logger module mock
 * @param {string} cacheKey - Expected cache key
 * @param {string} user_id - Expected user ID for repository call
 * @param {any} expectedData - Expected data to be cached
 * @param {number} cacheDuration - Expected cache duration in seconds
 * @param {string} errorMessage - Expected error message in logs
 */
export function assertCacheErrorFallbackBehavior(
   redis: any,
   userRepository: any,
   logger: any,
   cacheKey: string,
   user_id: string,
   expectedData: any,
   cacheDuration: number,
   errorMessage: string
): void {
   expect(redis.getCacheValue).toHaveBeenCalledWith(cacheKey);
   expect(logger.logger.error).toHaveBeenCalledWith(
      expect.stringContaining(errorMessage)
   );
   expect(userRepository.findByUserId).toHaveBeenCalledWith(user_id);
   expect(redis.setCacheValue).toHaveBeenCalledWith(
      cacheKey,
      cacheDuration,
      JSON.stringify(expectedData)
   );
}

/**
 * Asserts user creation success behavior - conflict check, hash, create, token config
 *
 * @param {any} repositoryModule - Repository module mock
 * @param {any} argon2Module - Argon2 module mock
 * @param {any} middlewareModule - Middleware module mock
 * @param {string} username - Expected username for conflict check
 * @param {string} email - Expected email for conflict check
 * @param {string} password - Expected password for hashing
 * @param {string} hashedPassword - Expected hashed password
 * @param {any} expectedUserData - Expected user data for creation
 * @param {string} user_id - Expected user ID for token config
 * @param {any} mockRes - Mock response object
 */
export function assertUserCreationSuccessBehavior(
   repositoryModule: any,
   argon2Module: any,
   middlewareModule: any,
   username: string,
   email: string,
   password: string,
   hashedPassword: string,
   expectedUserData: any,
   user_id: string,
   mockRes: any
): void {
   expect(repositoryModule.findConflictingUsers).toHaveBeenCalledWith(username, email);
   expect(argon2Module.hash).toHaveBeenCalledWith(password);
   expect(repositoryModule.create).toHaveBeenCalledWith(expect.objectContaining({
      ...expectedUserData,
      birthday: expect.any(String)
   }));
   expect(middlewareModule.configureToken).toHaveBeenCalledWith(mockRes, user_id);
}

/**
 * Asserts user creation conflict behavior - conflict check, no hash, no create, no token
 *
 * @param {any} repositoryModule - Repository module mock
 * @param {any} argon2Module - Argon2 module mock
 * @param {any} middlewareModule - Middleware module mock
 * @param {string} username - Expected username for conflict check
 * @param {string} email - Expected email for conflict check
 */
export function assertUserCreationConflictBehavior(
   repositoryModule: any,
   argon2Module: any,
   middlewareModule: any,
   username: string,
   email: string
): void {
   expect(repositoryModule.findConflictingUsers).toHaveBeenCalledWith(username, email);
   expect(argon2Module.hash).not.toHaveBeenCalled();
   expect(repositoryModule.create).not.toHaveBeenCalled();
   expect(middlewareModule.configureToken).not.toHaveBeenCalled();
}

/**
 * Asserts user update success behavior - conflict check, update, cache clear
 *
 * @param {any} repositoryModule - Repository module mock
 * @param {any} cacheModule - Cache module mock
 * @param {string} username - Expected username for conflict check
 * @param {string} email - Expected email for conflict check
 * @param {string} user_id - Expected user ID
 * @param {any} expectedUpdates - Expected updates data
 * @param {string} cacheKey - Expected cache key to clear
 */
export function assertUserUpdateSuccessBehavior(
   repositoryModule: any,
   cacheModule: any,
   username: string,
   email: string,
   user_id: string,
   expectedUpdates: any,
   cacheKey: string
): void {
   expect(repositoryModule.findConflictingUsers).toHaveBeenCalledWith(username, email, user_id);
   expect(repositoryModule.update).toHaveBeenCalledWith(user_id, expect.objectContaining({
      ...expectedUpdates,
      birthday: expect.any(String)
   }));
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(cacheKey);
}

/**
 * Asserts user deletion success behavior - delete, logout, cache clear
 *
 * @param {any} repositoryModule - Repository module mock
 * @param {any} authenticationServiceModule - Authentication service module mock
 * @param {any} cacheModule - Cache module mock
 * @param {string} user_id - Expected user ID
 * @param {any} mockRes - Mock response object
 */
export function assertUserDeletionSuccessBehavior(
   repositoryModule: any,
   authenticationServiceModule: any,
   cacheModule: any,
   user_id: string,
   mockRes: any
): void {
   expect(repositoryModule.deleteUser).toHaveBeenCalledWith(user_id);
   expect(authenticationServiceModule.logoutUser).toHaveBeenCalledWith(mockRes);
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(`accounts:${user_id}`);
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(`budgets:${user_id}`);
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(`transactions:${user_id}`);
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(`user:${user_id}`);
}

/**
 * Asserts user not found behavior - repository called, cache not set
 *
 * @param {any} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name (e.g., "findByUserId")
 * @param {any} cacheModule - Cache module mock
 * @param {string} repositoryParam - Expected parameter for repository call
 */
export function assertUserNotFoundBehavior(
   repositoryModule: any,
   repositoryMethod: string,
   cacheModule: any,
   repositoryParam: string
): void {
   expect(repositoryModule[repositoryMethod]).toHaveBeenCalledWith(repositoryParam);
   expect(cacheModule.setCacheValue).not.toHaveBeenCalled();
}