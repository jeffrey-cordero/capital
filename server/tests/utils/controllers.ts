/**
 * Controller test utilities, providing helper functions for testing controller success/error scenarios
*/

import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Request, Response } from "express";

import { createMockRequest, createMockResponse } from "@/tests/utils/api";

/**
 * Test service success responses
 *
 * @param {jest.MockedFunction} mockServiceFunction - The mocked service function
 * @param {ServerResponse} expectedResponse - Expected service response
 */
export function testServiceSuccess(
   mockServiceFunction: jest.MockedFunction<any>,
   expectedResponse: ServerResponse
): void {
   mockServiceFunction.mockResolvedValue(expectedResponse);
}

/**
 * Test service error responses
 *
 * @param {jest.MockedFunction} mockServiceFunction - The mocked service function
 * @param {ServerResponse} errorResponse - Error service response
 */
export function testServiceErrorResponse(
   mockServiceFunction: jest.MockedFunction<any>,
   errorResponse: ServerResponse
): void {
   mockServiceFunction.mockResolvedValue(errorResponse);
}

/**
 * Test service thrown errors
 *
 * @param {jest.MockedFunction} mockServiceFunction - The mocked service function
 * @param {Error} expectedError - Expected error to be thrown
 */
export function testServiceThrownError(
   mockServiceFunction: jest.MockedFunction<any>,
   expectedError: Error
): void {
   mockServiceFunction.mockRejectedValue(expectedError);
}

/**
 * Test Redis error scenarios with logging
 *
 * @param {jest.MockedFunction} mockServiceFunction - The mocked service function
 * @param {string} errorMessage - Expected error message
 * @param {string} code - Expected error code, where ECONNREFUSED is a Redis connection error always logged to the console
 */
export function testRedisErrorScenario(
   mockServiceFunction: jest.MockedFunction<any>,
   errorMessage: string,
   code: "ENOMEM" | "ECONNREFUSED" = "ENOMEM"
): void {
   // Mock Redis error
   const redisError = new Error(errorMessage);
   (redisError as any).code = code;
   redisError.stack = `Error: ${errorMessage}\n    at Redis connection`;

   mockServiceFunction.mockRejectedValue(redisError);
}

/**
 * Create mock repository response with exact types
 *
 * @param {T[]} data - Array of data to return
 * @returns {T[]} Mock repository response
 */
export function createMockRepositoryResponse<T>(data: T[]): T[] {
   return data;
}

/**
 * Create mock request with specific parameters
 *
 * @param {Partial<Request>} overrides - Request parameter overrides
 * @returns {Partial<Request>} Mock request object
 */
export function createMockControllerRequest(overrides: Partial<Request> = {}): Partial<Request> {
   return { ...createMockRequest(), ...overrides };
}

/**
 * Create mock response with locals
 *
 * @param {Record<string, any>} locals - Response locals
 * @returns {Partial<Response>} Mock response object
 */
export function createMockControllerResponse(locals: Record<string, any> = {}): Partial<Response> {
   const mockRes = createMockResponse();
   mockRes.locals = locals;
   return mockRes;
}

/**
 * Assert that a controller properly handled a service error by verifying the error response
 *
 * @param {Partial<Response>} mockRes - Mock response object
 * @param {number} [statusCode] - Expected HTTP status code (defaults to INTERNAL_SERVER_ERROR)
 * @param {Record<string, string>} [errors] - Expected error object (defaults to server error)
 */
export function assertControllerErrorResponse(
   mockRes: Partial<Response>,
   statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
   errors: Record<string, string> = { server: "Internal Server Error" }
): void {
   expect(mockRes.status).toHaveBeenCalledWith(statusCode);
   expect(mockRes.json).toHaveBeenCalledWith({
      code: statusCode,
      errors: errors
   });
   expect(mockRes.end).toHaveBeenCalled();
}

/**
 * Creates a mock for submitServiceRequest that properly handles both success and error cases
 * This function returns the mock implementation that can be used in Jest mock declarations
 *
 * @returns {Function} Mock implementation function
 */
export function createSubmitServiceRequestMock(): (res: Response, callback: () => Promise<ServerResponse>) => Promise<ServerResponse> {
   return async(res: Response, callback: () => Promise<ServerResponse>) => {
      try {
         return await callback();
      } catch (error: any) {
         // Simulate the real submitServiceRequest error handling
         const { sendErrors } = require("@/lib/response");
         return sendErrors(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" }) as ServerResponse;
      }
   };
}