/**
 * Controller test utilities, providing helper functions for testing controller success/error scenarios
*/

import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Response } from "express";


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
 * Assert that a controller properly handled a service success by verifying both the service call and the success response
 *
 * @param {Partial<Response>} mockRes - Mock response object
 * @param {jest.MockedFunction} mockServiceFunction - The mocked service function
 * @param {any[]} expectedServiceArgs - Expected arguments passed to the service function
 * @param {number} expectedStatusCode - Expected HTTP status code (200, 201, or 204)
 * @param {any} expectedData - Expected data to be sent in the response body
 */
export function assertControllerSuccessResponse(
   mockRes: Partial<Response>,
   mockServiceFunction: jest.MockedFunction<any>,
   expectedServiceArgs: any[],
   expectedStatusCode: number,
   expectedData: any
): void {
   // Verify the service function was called with the expected arguments
   expect(mockServiceFunction).toHaveBeenCalledWith(...expectedServiceArgs);

   // Verify the HTTP status code was set correctly
   expect(mockRes.status).toHaveBeenCalledWith(expectedStatusCode);

   if (expectedStatusCode === HTTP_STATUS.NO_CONTENT) {
      // For 204 responses, verify no JSON was sent
      expect(mockRes.json).not.toHaveBeenCalled();
   } else {
      // For 200/201 responses, verify JSON was sent with correct data
      expect(mockRes.json).toHaveBeenCalledWith({ data: expectedData });
   }

   // Always verify the response ends
   expect(mockRes.end).toHaveBeenCalled();
}

/**
 * Assert that a controller properly handled an error by verifying both the service call and the error response, which
 * handles both thrown errors and validation errors
 *
 * @param {Partial<Response>} mockRes - Mock response object
 * @param {Error} expectedError - Expected error that should be thrown by the service
 * @param {jest.MockedFunction} mockServiceFunction - The mocked service function
 * @param {any[]} [expectedServiceArgs] - Expected arguments passed to the service function
 * @param {number} [expectedStatusCode] - Expected HTTP status code (defaults to INTERNAL_SERVER_ERROR)
 * @param {Record<string, string>} [expectedErrors] - Expected error object (defaults to server error)
 */
export function assertControllerErrorResponse(
   mockRes: Partial<Response>,
   expectedError: Error,
   mockServiceFunction: jest.MockedFunction<any>,
   expectedServiceArgs?: any[],
   expectedStatusCode?: number,
   expectedErrors?: Record<string, string>
): void {
   const { logger } = require("@/lib/logger");

   // Verify the service function throws the expected error
   expect(mockServiceFunction()).rejects.toThrow(expectedError);

   // Verify the error stack is being logged
   expect(logger.error).toHaveBeenCalledWith(expectedError.stack);

   // If service args are provided, verify the service function was called with them
   if (expectedServiceArgs) {
      expect(mockServiceFunction).toHaveBeenCalledWith(...expectedServiceArgs);
   }

   // Use provided values or defaults
   const statusCode = expectedStatusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
   const errors = expectedErrors ?? { server: "Internal Server Error" };

   // Verify the controller handled the error response properly
   expect(mockRes.status).toHaveBeenCalledWith(statusCode);
   expect(mockRes.json).toHaveBeenCalledWith({ errors: errors });
   expect(mockRes.end).toHaveBeenCalled();
}

/**
 * Assert that a controller properly handled a validation error by verifying both the service call and the error response
 *
 * @param {Partial<Response>} mockRes - Mock response object
 * @param {jest.MockedFunction} mockServiceFunction - The mocked service function
 * @param {any[]} expectedServiceArgs - Expected arguments passed to the service function
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {Record<string, string>} expectedErrors - Expected error object
 */
export function assertControllerValidationErrorResponse(
   mockRes: Partial<Response>,
   mockServiceFunction: jest.MockedFunction<any>,
   expectedServiceArgs: any[],
   expectedStatusCode: number,
   expectedErrors: Record<string, string>
): void {
   // Verify the service function was called with the expected arguments
   expect(mockServiceFunction).toHaveBeenCalledWith(...expectedServiceArgs);

   // Verify the controller handled the error response properly
   expect(mockRes.status).toHaveBeenCalledWith(expectedStatusCode);
   expect(mockRes.json).toHaveBeenCalledWith({ errors: expectedErrors });
   expect(mockRes.end).toHaveBeenCalled();
}

/**
 * Create a mock submit service request function
 *
 * @returns {jest.Mock} Mock submit service request function
 */
export function createMockSubmitServiceRequest(): jest.Mock {
   return jest.fn(async(res, callback) => {
      const { logger } = require("@/lib/logger");
      const { sendSuccess, sendErrors } = require("@/lib/response");

      // Make sure error logging is mocked
      logger.error = jest.fn();

      try {
         const result: ServerResponse = await callback();

         if (result.code === HTTP_STATUS.OK || result.code === HTTP_STATUS.CREATED || result.code === HTTP_STATUS.NO_CONTENT) {
            // Success response
            return sendSuccess(res, result.code, result.data ?? undefined);
         } else {
            // Error response
            return sendErrors(res, result.code, result.errors);
         }
      } catch (error: any) {
         // Log unexpected errors
         logger.error(error.stack);

         return sendErrors(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
      }
   });
}