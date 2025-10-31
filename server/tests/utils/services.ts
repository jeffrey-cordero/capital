import { HTTP_STATUS, ServerResponse } from "capital/server";

import { logger } from "@/lib/logger";
import { MockResponse } from "@/tests/utils/api";
import { MockedServiceFunction } from "@/tests/utils/controllers";

/**
 * Mocked repository function type
 *
 * @template T - Repository function type
 * @returns {jest.MockedFunction<T>} Mocked function
 */
export type MockedRepositoryFunction<T extends (...args: unknown[]) => unknown> = jest.MockedFunction<T>;

/**
 * Arrange argon2 mocks for verify and hash
 *
 * @param {jest.Mocked<any>} argon2Module - argon2 module mock
 * @param {string} hashedPassword - Hashed password returned by hash
 * @param {boolean} [verifyResult] - Verify result (`false` by default)
 */
export function arrangeArgon2Mocks(argon2Module: jest.Mocked<any>, hashedPassword: string, verifyResult: boolean = false): void {
   argon2Module.hash.mockResolvedValue(hashedPassword);
   argon2Module.verify.mockResolvedValue(verifyResult);
}

/**
 * Asserts argon2 method calls, where a missing hashed/plain password implies
 * the respective verify method should not have been called and a missing hashing
 * password implies the hash method should not have been called
 *
 * @param {jest.Mocked<any>} argon2Module - argon2 module mock
 * @param {string} [hashedPassword] - Expected hashed password for verify
 * @param {string} [plainPassword] - Expected plain password for verify
 * @param {string} [hashingPassword] - Expected password for hash
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
 * Arrange argon2 verify to throw an error
 *
 * @param {jest.Mocked<any>} argon2Module - argon2 module mock
 * @param {Error} error - Error to throw from verify
 */
export function arrangeArgon2Error(argon2Module: jest.Mocked<any>, error: Error): void {
   argon2Module.verify.mockRejectedValue(error);
}

/**
 * Arrange a mock repository method to resolve with data
 *
 * @param {jest.Mocked<any>} repositoryModule - Repository module to mock
 * @param {string} methodName - Repository method name
 * @param {any} data - Data to return
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} Mocked function
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
 * Arrange a mock repository method to throw an error
 *
 * @param {jest.Mocked<any>} repositoryModule - Repository module to mock
 * @param {string} methodName - Repository method name
 * @param {string} errorMessage - Error message
 * @returns {MockedRepositoryFunction<typeof repositoryModule[typeof methodName]>} Mocked function
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
 * @param {jest.Mocked<any>} cacheModule - Cache module mock
 */
export function arrangeDefaultRedisCacheBehavior(cacheModule: jest.Mocked<any>): void {
   cacheModule.getCacheValue.mockResolvedValue(null);
   cacheModule.setCacheValue.mockResolvedValue(undefined);
   cacheModule.removeCacheValue.mockResolvedValue(undefined);
}

/**
 * Arranges a mock cache read operation to return data successfully
 *
 * @param {jest.Mocked<any>} cacheModule - Cache module mock
 * @param {string} data - Cached data
 * @returns {MockedServiceFunction<typeof cacheModule.getCacheValue>} Mocked function
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
 * @param {jest.Mocked<any>} cacheModule - Cache module mock
 * @returns {MockedServiceFunction<typeof cacheModule.getCacheValue>} Mocked function
 */
export function arrangeMockCacheMiss(
   cacheModule: jest.Mocked<any>
): MockedServiceFunction<typeof cacheModule.getCacheValue> {
   const mockFunction = cacheModule.getCacheValue as MockedServiceFunction<typeof cacheModule.getCacheValue>;
   mockFunction.mockResolvedValue(null);

   return mockFunction;
}

/**
 * Assert a service method returned a success response
 *
 * @param {ServerResponse} result - Service response
 * @param {number} expectedStatusCode - Expected HTTP status
 * @param {Record<string, any> | undefined} expectedData - Expected data (undefined for NO_CONTENT)
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
 * Assert cache invalidation was not called during error scenarios
 *
 * @param {jest.Mocked<any>} redis - Redis mock module
 */
export function assertCacheInvalidationNotCalled(
   redis: jest.Mocked<any>
): void {
   assertMethodNotCalled(redis, "removeCacheValue");
}

/**
 * Assert a service method returned an error response
 *
 * @param {ServerResponse} result - Service response
 * @param {number} expectedStatusCode - Expected HTTP status
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
 * @param {string} repositoryParam - Expected repository parameter
 * @param {any} expectedData - Expected data to cache
 * @param {number} cacheDuration - Cache duration in seconds
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
 * Assert cache invalidation call
 *
 * @param {jest.Mocked<any>} cacheModule - Cache module mock
 * @param {string} cacheKey - Cache key to invalidate
 */
export function assertCacheInvalidation(cacheModule: jest.Mocked<any>, cacheKey: string): void {
   expect(cacheModule.removeCacheValue).toHaveBeenCalledWith(cacheKey);
}

/**
 * Assert a repository method call and optional return value
 *
 * @param {jest.Mocked<any>} repositoryModule - Repository module mock
 * @param {string} repositoryMethod - Repository method name
 * @param {any[]} expectedParams - Expected parameters
 * @param {any | undefined} expectedReturnValue - Optional expected return value
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
 * Call a service method with a mocked response
 *
 * @param {MockResponse} mockRes - Mock response
 * @param {jest.Mocked<any>} serviceModule - Service module to call
 * @param {string} methodName - Service method name
 * @param {...unknown} args - Additional arguments
 * @returns {Promise<ServerResponse>} Result
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
 * Assert multiple methods were not called during error scenarios
 *
 * @param {Array<{module: jest.Mocked<any>, methods: string[]}>} moduleMethods - Modules and methods to assert
 */
export function assertMethodsNotCalled(moduleMethods: Array<{module: jest.Mocked<any>, methods: string[]}>): void {
   moduleMethods.forEach(({ module, methods }) => {
      methods.forEach(method => expect(module[method]).not.toHaveBeenCalled());
   });
}

/**
 * Assert a single method was not called during error scenarios
 *
 * @param {jest.Mocked<any>} module - Module to assert
 * @param {string} method - Method name
 */
export function assertMethodNotCalled(module: jest.Mocked<any>, method: string): void {
   expect(module[method]).not.toHaveBeenCalled();
}

/**
 * Assert a service method throws the expected error and logs the stack
 *
 * @param {() => Promise<ServerResponse>} serviceCall - Service call function
 * @param {string} expectedErrorMessage - Expected error message
 * @returns {Promise<void>} Void
 */
export async function assertServiceThrows(serviceCall: () => Promise<ServerResponse>, expectedErrorMessage: string): Promise<void> {
   try {
      await serviceCall();
      throw new Error(`Expected service to throw "${expectedErrorMessage}" but it succeeded instead...`);
   } catch (error: any) {
      expect(error.message).toBe(expectedErrorMessage);
   }
}