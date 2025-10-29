import { HTTP_STATUS, ServerResponse } from "capital/server";

import { logger } from "@/lib/logger";
import { MockResponse } from "@/tests/utils/api";
import { MockedServiceFunction } from "@/tests/utils/controllers";

/**
 * Mocked repository function type
 *
 * @template T - The type of the repository function
 * @returns {jest.MockedFunction<T>} The mocked repository function
 */
export type MockedRepositoryFunction<T extends (...args: unknown[]) => unknown> = jest.MockedFunction<T>;

/**
 * Arranges argon2 mocks for password verification and hashing
 *
 * @param {jest.Mocked<any>} argon2Module - The argon2 module to mock
 * @param {string} hashedPassword - The hashed password to return from the hash operation
 * @param {boolean} [verifyResult] - The result to return from the verify operation (defaults to `false`)
 */
export function arrangeArgon2Mocks(argon2Module: jest.Mocked<any>, hashedPassword: string, verifyResult: boolean = false): void {
   argon2Module.hash.mockResolvedValue(hashedPassword);
   argon2Module.verify.mockResolvedValue(verifyResult);
}

/**
 * Asserts argon2 method calls, where a missing hashed/plain password implies
 * the respective verify method should not have been called and a missing hashing password implies
 * the hash method should not have been called
 *
 * @param {jest.Mocked<any>} argon2Module - The argon2 module to assert
 * @param {string} [hashedPassword] - If provided, asserts verify was called with this hashed password
 * @param {string} [plainPassword] - If provided, asserts verify was called with this password to verify
 * @param {string} [hashingPassword] - If provided, asserts hash was called with this password to hash
 */
export function assertArgon2Calls(
   argon2Module: jest.Mocked<any>,
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
 * Arranges argon2 mock to throw an error
 *
 * @param {jest.Mocked<any>} argon2Module - The argon2 module to mock
 * @param {Error} error - Error to throw from argon2.verify
 */
export function arrangeArgon2Error(argon2Module: jest.Mocked<any>, error: Error): void {
   argon2Module.verify.mockRejectedValue(error);
}

/**
 * Arranges a mock repository method to return data successfully
 *
 * @param {jest.Mocked<any>} repositoryModule - The repository module to mock
 * @param {string} methodName - The method name of the repository method to mock
 * @param {any} data - Data to return from the repository method
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} The mocked repository function
 */
export function arrangeMockRepositorySuccess(
   repositoryModule: jest.Mocked<any>,
   methodName: string,
   data: any
): MockedRepositoryFunction<typeof repositoryModule[typeof methodName]> {
   const mockFunction = repositoryModule[methodName] as MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>;
   mockFunction.mockResolvedValue(data);

   return mockFunction;
}

/**
 * Arranges a mock repository method to throw an error
 *
 * @param {jest.Mocked<any>} repositoryModule - The repository module to mock
 * @param {string} methodName - The method name of the repository method to mock
 * @param {string} errorMessage - Error message to throw
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} The mocked repository method
 */
export function arrangeMockRepositoryError(
   repositoryModule: jest.Mocked<any>,
   methodName: string,
   errorMessage: string
): MockedRepositoryFunction<typeof repositoryModule[typeof methodName]> {
   const mockFunction = repositoryModule[methodName] as MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>;
   mockFunction.mockRejectedValue(new Error(errorMessage));

   return mockFunction;
}

/**
 * Arranges default Redis cache behavior for all cache methods to return `null`
 * for cache reads, `undefined` for cache writes, and `undefined` for cache invalidations
 *
 * @param {jest.Mocked<any>} cacheModule - The cache module to mock
 */
export function arrangeDefaultRedisCacheBehavior(cacheModule: jest.Mocked<any>): void {
   cacheModule.getCacheValue.mockResolvedValue(null);
   cacheModule.setCacheValue.mockResolvedValue(undefined);
   cacheModule.removeCacheValue.mockResolvedValue(undefined);
}

/**
 * Arranges a mock cache read operation to return data successfully
 *
 * @param {jest.Mocked<any>} cacheModule - The cache module to mock
 * @param {string} data - Cached data to return
 * @returns {MockedServiceFunction<typeof cacheModule.getCacheValue>} The mocked cache read operation
 */
export function arrangeMockCacheHit(
   cacheModule: jest.Mocked<any>,
   data: string
): MockedServiceFunction<typeof cacheModule.getCacheValue> {
   const mockFunction = cacheModule.getCacheValue as MockedServiceFunction<typeof cacheModule.getCacheValue>;
   mockFunction.mockResolvedValue(data);

   return mockFunction;
}

/**
 * Arranges a mock cache read operation to return `null`, implying a cache miss
 *
 * @param {jest.Mocked<any>} cacheModule - The cache module to mock
 * @returns {MockedServiceFunction<typeof cacheModule.getCacheValue>} The mocked cache read operation
 */
export function arrangeMockCacheMiss(
   cacheModule: jest.Mocked<any>
): MockedServiceFunction<typeof cacheModule.getCacheValue> {
   const mockFunction = cacheModule.getCacheValue as MockedServiceFunction<typeof cacheModule.getCacheValue>;
   mockFunction.mockResolvedValue(null);

   return mockFunction;
}

/**
 * Asserts that a service method properly handled a successful response
 *
 * @param {ServerResponse} result - Service response result
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {Record<string, any> | undefined} expectedData - Expected data in the response (defaults to `undefined` for `HTTP_STATUS.NO_CONTENT`)
 */
export function assertServiceSuccessResponse(
   result: ServerResponse,
   expectedStatusCode: number,
   expectedData: Record<string, any> | undefined = undefined
): void {
   const { statusCode, data } = result;
   expect(statusCode).toBe(expectedStatusCode);

   if (expectedData !== undefined) {
      expect(data).toEqual(expectedData);
   } else {
      expect(statusCode).toBe(HTTP_STATUS.NO_CONTENT);
   }
}

/**
 * Asserts that a cache invalidation operation was not called during error scenarios
 *
 * @param {jest.Mocked<any>} redis - Redis mock module
 */
export function assertCacheInvalidationNotCalled(
   redis: jest.Mocked<any>
): void {
   assertMethodNotCalled(redis, "removeCacheValue");
}

/**
 * Asserts that a service method properly handled an unsuccessful response
 *
 * @param {ServerResponse} result - Service response result
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {Record<string, any>} expectedErrors - Expected error object or pattern
 */
export function assertServiceErrorResponse(
   result: ServerResponse,
   expectedStatusCode: number,
   expectedErrors: Record<string, any>
): void {
   expect(result.statusCode).toBe(expectedStatusCode);

   if (expectedStatusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      // The error stack should be logged to the console by the logger
      expect(logger.error).toHaveBeenCalledWith(expect.any(String));
   }

   // Assert the error object matches the expected errors
   expect(result.errors).toEqual(expect.objectContaining(expectedErrors));
}

/**
 * Asserts that a cache hit operation was called, repository was not called, and
 * a cache write operation was not called to imply a successful cache hit
 *
 * @param {jest.Mocked<any>} cacheModule - Cache module mock
 * @param {jest.Mocked<any>} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name
 * @param {string} cacheKey - Expected cache key
 */
export function assertCacheHitBehavior(
   cacheModule: jest.Mocked<any>,
   repositoryModule: jest.Mocked<any>,
   repositoryMethod: string,
   cacheKey: string
): void {
   expect(cacheModule.getCacheValue).toHaveBeenCalledWith(cacheKey);
   expect(repositoryModule[repositoryMethod]).not.toHaveBeenCalled();
   expect(cacheModule.setCacheValue).not.toHaveBeenCalled();
}

/**
 * Asserts that a cache miss operation was called, repository was called, and
 * a cache write operation was called to imply a successful cache miss
 *
 * @param {jest.Mocked<any>} cacheModule - Cache module mock
 * @param {jest.Mocked<any>} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name
 * @param {string} cacheKey - Expected cache key
 * @param {string} repositoryParam - Expected parameter for repository call
 * @param {any} expectedData - Expected data to be cached
 * @param {number} cacheDuration - Expected cache duration in seconds (in seconds)
 */
export function assertCacheMissBehavior(
   cacheModule: jest.Mocked<any>,
   repositoryModule: jest.Mocked<any>,
   repositoryMethod: string,
   cacheKey: string,
   repositoryParam: string,
   expectedData: any,
   cacheDuration: number
): void {
   expect(cacheModule.getCacheValue).toHaveBeenCalledWith(cacheKey);
   expect(repositoryModule[repositoryMethod]).toHaveBeenCalledWith(repositoryParam);
   expect(cacheModule.setCacheValue).toHaveBeenCalledWith(cacheKey, cacheDuration, JSON.stringify(expectedData));
}

/**
 * Asserts that a cache invalidation operation was called with the expected cache key
 *
 * @param {jest.Mocked<any>} cacheModule - Cache module mock
 * @param {string} cacheKey - Expected cache key to be invalidated
 */
export function assertCacheInvalidation(cacheModule: jest.Mocked<any>, cacheKey: string): void {
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(cacheKey);
}

/**
 * Asserts that a repository method was called with expected parameters and optionally
 * verifies the return value, if applicable
 *
 * @param {jest.Mocked<any>} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name
 * @param {any[]} expectedParams - Expected parameters passed to the repository method
 * @param {any | undefined} expectedReturnValue - Optional expected return value from the repository method (defaults to `undefined`)
 */
export function assertRepositoryCall(
   repositoryModule: jest.Mocked<any>,
   repositoryMethod: string,
   expectedParams: any[],
   expectedReturnValue: any | undefined = undefined
): void {
   expect(repositoryModule[repositoryMethod]).toHaveBeenCalledWith(...expectedParams);

   if (expectedReturnValue !== undefined) {
      expect(repositoryModule[repositoryMethod]).toHaveReturnedWith(expectedReturnValue);
   }
}

/**
 * Calls a service method with proper type casting for Express middleware/controller
 * functions to avoid type errors when calling service methods in unit tests
 *
 * @param {MockResponse} mockRes - Mock response object
 * @param {jest.Mocked<any>} serviceModule - The service module to call the method on
 * @param {string} methodName - The method name of the service method to call
 * @param {...unknown} args - Additional arguments to pass to the service method
 * @returns {Promise<ServerResponse>} The result of the service method call
 */
export async function callServiceMethodWithMockRes(
   mockRes: MockResponse,
   serviceModule: jest.Mocked<any>,
   methodName: string,
   ...args: unknown[]
): Promise<ServerResponse> {
   return await serviceModule[methodName](mockRes, ...args) as ServerResponse;
}

/**
 * Asserts that multiple methods were not called during error scenarios
 *
 * @param {Array<{module: jest.Mocked<any>, methods: string[]}>} moduleMethods - Array of modules with their method names to assert were not called
 */
export function assertMethodsNotCalled(moduleMethods: Array<{module: jest.Mocked<any>, methods: string[]}>): void {
   moduleMethods.forEach(({ module, methods }) => {
      methods.forEach(method => expect(module[method]).not.toHaveBeenCalled());
   });
}

/**
 * Asserts that a single method was not called during error scenarios
 *
 * @param {jest.Mocked<any>} module - The module to assert
 * @param {string} method - The method name to assert was not called
 */
export function assertMethodNotCalled(module: jest.Mocked<any>, method: string): void {
   expect(module[method]).not.toHaveBeenCalled();
}

/**
 * Asserts that a service method throws the expected error and logs the error stack
 *
 * @param {() => Promise<ServerResponse>} serviceCall - The service method call (should be a function that returns a promise)
 * @param {string} expectedErrorMessage - The expected error message to throw
 * @returns {Promise<void>} A promise that resolves when the service method throws the expected error and logs the error stack
 */
export async function assertServiceThrows(serviceCall: () => Promise<ServerResponse>, expectedErrorMessage: string): Promise<void> {
   try {
      await serviceCall();
      throw new Error(`Expected service to throw "${expectedErrorMessage}" but it succeeded instead...`);
   } catch (error: any) {
      expect(error.message).toBe(expectedErrorMessage);
   }
}