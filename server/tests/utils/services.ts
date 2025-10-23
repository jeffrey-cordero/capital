import { HTTP_STATUS, ServerResponse } from "capital/server";

import { MockResponse } from "@/tests/utils/api";
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
 * @param {string} errorMessage - Database error message to throw
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} The mocked repository function
 */
export function setupMockRepositoryError(
   repositoryModule: any,
   methodName: string,
   errorMessage: string
): MockedRepositoryFunction<typeof repositoryModule[typeof methodName]> {
   const mockFunction = repositoryModule[methodName] as MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>;
   mockFunction.mockRejectedValue(new Error(errorMessage));
   return mockFunction;
}

/**
 * Helper function to setup a mock cache function with successful hit
 *
 * @param {any} cacheModule - The cache module to mock
 * @param {string} data - Cached data to return
 * @returns {MockedServiceFunction<typeof cacheModule.getCacheValue>} The mocked cache function
 */
export function setupMockCacheHit(
   cacheModule: any,
   data: string
): MockedServiceFunction<typeof cacheModule.getCacheValue> {
   const mockFunction = cacheModule.getCacheValue as MockedServiceFunction<typeof cacheModule.getCacheValue>;
   mockFunction.mockResolvedValue(data);
   return mockFunction;
}

/**
 * Helper function to setup a mock cache function with cache miss (null return)
 *
 * @param {any} cacheModule - The cache module to mock
 * @returns {MockedServiceFunction<typeof cacheModule.getCacheValue>} The mocked cache function
 */
export function setupMockCacheMiss(
   cacheModule: any
): MockedServiceFunction<typeof cacheModule.getCacheValue> {
   const mockFunction = cacheModule.getCacheValue as MockedServiceFunction<typeof cacheModule.getCacheValue>;
   mockFunction.mockResolvedValue(null);
   return mockFunction;
}

/**
 * Helper function to setup default Redis cache behavior for all cache methods
 *
 * @param {any} cacheModule - The cache module to mock
 */
export function setupDefaultRedisCacheBehavior(cacheModule: any): void {
   cacheModule.getCacheValue.mockResolvedValue(null);
   cacheModule.setCacheValue.mockResolvedValue(undefined);
   cacheModule.removeCacheValue.mockResolvedValue(undefined);
}

/**
 * Asserts that a service function properly handled a success response
 *
 * @param {any} result - Service response result
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {Object | undefined} [expectedData] - Expected data in the response (undefined for NO_CONTENT)
 */
export function assertServiceSuccessResponse(
   result: any,
   expectedStatusCode: number,
   expectedData?: object | undefined
): void {
   const { statusCode, data } = result;
   expect(statusCode).toBe(expectedStatusCode);
   expect(data).toEqual(expectedData);
}

/**
 * Asserts validation error response for create/update operations
 *
 * @param {any} result - Service response result
 * @param {any} argon2 - Argon2 mock module
 * @param {any} userRepository - User repository mock module
 * @param {any} middleware - Middleware mock module
 * @param {any} redis - Redis mock module (optional, for update operations)
 * @param {any} expectedErrors - Expected validation errors
 * @param {boolean} isUpdate - Whether this is for update operations (default: false)
 */
export function assertValidationErrorResponse(
   result: any,
   argon2: any,
   userRepository: any,
   middleware: any,
   redis: any = null,
   expectedErrors: any,
   isUpdate: boolean = false
): void {
   assertArgon2Calls(argon2);
   if (isUpdate) {
      assertMethodsNotCalled([
         { module: userRepository, methods: ["findConflictingUsers", "findByUserId", "update"] },
         { module: redis, methods: ["removeCacheValue"] }
      ]);
   } else {
      assertMethodsNotCalled([
         { module: userRepository, methods: ["findConflictingUsers", "create"] },
         { module: middleware, methods: ["configureToken"] }
      ]);
   }

   assertServiceErrorResponse(result, HTTP_STATUS.BAD_REQUEST, expectedErrors);
}

/**
 * Asserts that update operations were not called during conflict scenarios
 *
 * @param {any} userRepository - User repository mock module
 * @param {any} redis - Redis mock module
 */
export function assertUpdateOperationsNotCalled(
   userRepository: any,
   redis: any
): void {
   assertMethodsNotCalled([
      { module: userRepository, methods: ["update"] },
      { module: redis, methods: ["removeCacheValue"] }
   ]);
}

/**
 * Asserts that delete operations were not called during error scenarios
 *
 * @param {any} authenticationService - Authentication service mock module
 * @param {any} redis - Redis mock module
 */
export function assertDeleteOperationsNotCalled(
   authenticationService: any,
   redis: any
): void {
   assertMethodsNotCalled([
      { module: authenticationService, methods: ["logoutUser"] },
      { module: redis, methods: ["removeCacheValue"] }
   ]);
}

/**
 * Asserts that cache invalidation was not called during error scenarios
 *
 * @param {any} redis - Redis mock module
 */
export function assertCacheInvalidationNotCalled(
   redis: any
): void {
   assertMethodNotCalled(redis, "removeCacheValue");
}

/**
 * Asserts that a service function properly handled an error response
 *
 * @param {ServerResponse} result - Service response result
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {Record<string, any>} expectedErrors - Expected error object or pattern
 * @param {boolean} [exactMatch] - Whether to use exact matching (default: true) or partial matching
 */
export function assertServiceErrorResponse(
   result: ServerResponse,
   expectedStatusCode: number,
   expectedErrors: Record<string, any>,
   exactMatch: boolean = true
): void {
   const { logger } = require("@/lib/logger");
   expect(result.statusCode).toBe(expectedStatusCode);

   if (expectedStatusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      // Typically, this will be the error stack relative to the service method call
      expect(logger.error).toHaveBeenCalledWith(expect.any(String));
   }

   if (exactMatch) {
      expect(result.errors).toEqual(expectedErrors);
   } else {
      expect(result.errors).toEqual(expect.objectContaining(expectedErrors));
   }
}

/**
 * Asserts cache hit behavior - cache was called, repository was not called, cache was not set
 *
 * @param {any} cacheModule - Cache module mock
 * @param {any} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name (e.g., "findByUserId")
 * @param {string} cacheKey - Expected cache key
 */
export function assertCacheHitBehavior(
   cacheModule: any,
   repositoryModule: any,
   repositoryMethod: string,
   cacheKey: string
): void {
   expect(cacheModule.getCacheValue).toHaveBeenCalledWith(cacheKey);
   expect(repositoryModule[repositoryMethod]).not.toHaveBeenCalled();
   expect(cacheModule.setCacheValue).not.toHaveBeenCalled();
}

/**
 * Asserts cache miss behavior - cache was called, repository was called, cache was set
 *
 * @param {any} cacheModule - Cache module mock
 * @param {any} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name (e.g., "findByUserId")
 * @param {string} cacheKey - Expected cache key
 * @param {string} repositoryParam - Expected parameter for repository call
 * @param {any} expectedData - Expected data to be cached
 * @param {number} cacheDuration - Expected cache duration in seconds
 */
export function assertCacheMissBehavior(
   cacheModule: any,
   repositoryModule: any,
   repositoryMethod: string,
   cacheKey: string,
   repositoryParam: string,
   expectedData: any,
   cacheDuration: number
): void {
   expect(cacheModule.getCacheValue).toHaveBeenCalledWith(cacheKey);
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
 * @param {any} mockRes - Mock response object
 * @param {any} repositoryModule - Repository module mock
 * @param {any} argon2Module - Argon2 module mock
 * @param {any} middlewareModule - Middleware module mock
 * @param {string} password - Expected password for hashing
 * @param {Record<string, any>} expectedUserData - Expected user data for creation including the hashed password
 * @param {string} userId - Expected user ID for token config
 */
export function assertUserCreationSuccessBehavior(
   mockRes: MockResponse,
   repositoryModule: any,
   argon2Module: any,
   middlewareModule: any,
   password: string,
   expectedUserData: Record<string, any>,
   userId: string
): void {
   expect(repositoryModule.findConflictingUsers).toHaveBeenCalledWith(expectedUserData.username, expectedUserData.email);
   expect(argon2Module.hash).toHaveBeenCalledWith(password);
   expect(repositoryModule.create).toHaveBeenCalledWith(expect.objectContaining(expectedUserData));
   expect(middlewareModule.configureToken).toHaveBeenCalledWith(mockRes, userId);
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
   assertMethodsNotCalled([
      { module: argon2Module, methods: ["hash"] },
      { module: repositoryModule, methods: ["create"] },
      { module: middlewareModule, methods: ["configureToken"] }
   ]);
}

/**
 * Asserts user update success behavior - conflict check, update, cache clear
 *
 * @param {any} repositoryModule - Repository module mock
 * @param {any} cacheModule - Cache module mock
 * @param {string} username - Expected username for conflict check
 * @param {string} email - Expected email for conflict check
 * @param {string} userId - Expected user ID
 * @param {Record<string, any>} expectedUpdates - Expected updates data
 * @param {string} cacheKey - Expected cache key to clear
 */
export function assertUserUpdateSuccessBehavior(
   repositoryModule: any,
   cacheModule: any,
   username: string,
   email: string,
   userId: string,
   expectedUpdates: Record<string, any>,
   cacheKey: string
): void {
   expect(repositoryModule.findConflictingUsers).toHaveBeenCalledWith(username, email, userId);
   expect(repositoryModule.update).toHaveBeenCalledWith(userId, expect.objectContaining(expectedUpdates));
   assertCacheInvalidation(cacheModule, cacheKey);
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
   ["accounts", "budgets", "transactions", "user"].forEach(key => {
      assertCacheInvalidation(cacheModule, `${key}:${user_id}`);
   });
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

/**
 * Asserts that a repository function was called with expected parameters and optionally verifies return value
 *
 * @param {any} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name (e.g., "deleteUser", "findByUserId", "create")
 * @param {any} expectedParams - Expected parameters passed to the repository function
 * @param {any} [expectedReturnValue] - Optional expected return value from the repository function
 */
export function assertRepositoryCall(
   repositoryModule: any,
   repositoryMethod: string,
   expectedParams: any[],
   expectedReturnValue?: any
): void {
   expect(repositoryModule[repositoryMethod]).toHaveBeenCalledWith(...expectedParams);

   if (expectedReturnValue !== undefined) {
      expect(repositoryModule[repositoryMethod]).toHaveReturnedWith(expectedReturnValue);
   }
}

/**
 * Helper function to call service methods with proper type casting for mockRes
 *
 * @param {MockResponse} mockRes - Mock response object
 * @param {any} serviceModule - The service module to call
 * @param {string} methodName - The method name to call
 * @param {...any} args - Additional arguments to pass to the service method
 * @returns {Promise<any>} The result of the service method call
 */
export async function callServiceMethodWithMockRes(
   mockRes: MockResponse,
   serviceModule: any,
   methodName: string,
   ...args: any[]
): Promise<any> {
   return await serviceModule[methodName](mockRes, ...args);
}

/**
 * Asserts that multiple methods were not called
 *
 * @param {Array<{module: any, methods: string[]}>} moduleMethods - Array of modules with their method names to assert were not called
 */
export function assertMethodsNotCalled(moduleMethods: Array<{module: any, methods: string[]}>): void {
   moduleMethods.forEach(({ module, methods }) => {
      methods.forEach(method => expect(module[method]).not.toHaveBeenCalled());
   });
}

/**
 * Asserts that a single method was not called on a module for simplicity
 *
 * @param {any} module - The module to assert
 * @param {string} method - The method name to assert was not called
 */
export function assertMethodNotCalled(module: any, method: string): void {
   expect(module[method]).not.toHaveBeenCalled();
}

/**
 * Asserts that cache invalidation was called with the expected cache key
 *
 * @param {any} cacheModule - Cache module mock
 * @param {string} cacheKey - Expected cache key to be invalidated
 */
export function assertCacheInvalidation(cacheModule: any, cacheKey: string): void {
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(cacheKey);
}

/**
 * Helper function to test that a service method throws the expected error,
 * which naturally propagates errors without try-catch blocks for controller
 * error handling.
 *
 * @param {() => Promise<ServerResponse>} serviceCall - The service method call (should be a function that returns a promise)
 * @param {string} expectedErrorMessage - The expected error message
 * @returns {Promise<void>}
 */
export async function expectServiceToThrow(serviceCall: () => Promise<ServerResponse>, expectedErrorMessage: string): Promise<void> {
   try {
      await serviceCall();
      fail(`Expected service to throw "${expectedErrorMessage}" but it succeeded`);
   } catch (error: any) {
      expect(error.message).toBe(expectedErrorMessage);
   }
}

/**
 * Helper function to setup argon2 mocks for password verification and hashing
 *
 * @param {any} argon2Module - The argon2 module to mock
 * @param {string} hashedPassword - The hashed password to return from hash operation
 * @param {boolean} [verifyResult] - The result to return from verify operation (defaults to false)
 */
export function setupArgon2Mocks(argon2Module: any, hashedPassword: string, verifyResult: boolean = false): void {
   argon2Module.verify.mockResolvedValue(verifyResult);
   argon2Module.hash.mockResolvedValue(hashedPassword);
}

/**
 * Helper function to assert argon2 method calls, where undefined hashed or plain password implies
 * the respective verify method should not have been called and undefined hashing password implies
 * the hash method should not have been called
 *
 * @param {any} argon2Module - The argon2 module to assert
 * @param {string} [hashedPassword] - If provided, asserts verify was called with this hash
 * @param {string} [plainPassword] - If provided, asserts verify was called with this plain password
 * @param {string} [hashingPassword] - If provided, asserts hash was called with this plain password
 */
export function assertArgon2Calls(
   argon2Module: any,
   hashedPassword?: string,
   plainPassword?: string,
   hashingPassword?: string
): void {
   if (hashedPassword !== undefined && plainPassword !== undefined) {
      expect(argon2Module.verify).toHaveBeenCalledWith(hashedPassword, plainPassword);
   } else {
      expect(argon2Module.verify).not.toHaveBeenCalled();
   }

   if (hashingPassword !== undefined) {
      expect(argon2Module.hash).toHaveBeenCalledWith(hashingPassword);
   } else {
      expect(argon2Module.hash).not.toHaveBeenCalled();
   }
}

/**
 * Setup argon2 mock to throw an error
 *
 * @param {any} argon2Module - The argon2 module to mock
 * @param {Error} error - Error to throw from argon2.verify
 */
export function setupArgon2Error(argon2Module: any, error: Error): void {
   argon2Module.verify.mockRejectedValue(error);
}