import { HTTP_STATUS, ServerResponse } from "capital/server";
import { RequestHandler, Response } from "express";

import { MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";

/**
 * Mocked service function type
 *
 * @template T - The type of the service function
 * @returns {jest.MockedFunction<T>} The mocked service function
 */
export type MockedServiceFunction<T extends (..._args: unknown[]) => unknown> = jest.MockedFunction<T>;

/**
 * Arranges a mock submit service request function
 *
 * @returns {jest.Mock} Mock submit service request function
 */
export function createMockSubmitServiceRequest(): jest.Mock {
   return jest.fn(async(mockRes: MockResponse, callback: () => Promise<ServerResponse>) => {
      const { logger } = require("@/lib/logger");
      const { sendSuccess, sendErrors } = require("@/lib/response");

      // Make sure error logging is mocked
      logger.error = jest.fn();

      try {
         const result: ServerResponse = await callback();

         if (result.statusCode === HTTP_STATUS.OK || result.statusCode === HTTP_STATUS.CREATED || result.statusCode === HTTP_STATUS.NO_CONTENT || result.data?.refreshable) {
            // Success response
            return sendSuccess(mockRes, result.statusCode, result.data ?? undefined);
         } else {
            // Error response
            return sendErrors(mockRes, result.statusCode, result.errors);
         }
      } catch (error: any) {
         // Log unexpected errors
         logger.error(error.stack);

         return sendErrors(mockRes, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
      }
   });
}

/**
 * Arranges a mock service function with success response in one line
 *
 * @param {any} serviceModule - The service module to mock
 * @param {string} methodName - The method name of the service to mock
 * @param {number} statusCode - HTTP status code of the response
 * @param {Object | undefined} data - Response data, if applicable
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} The mocked service function
 */
export function arrangeMockServiceSuccess(
   serviceModule: any,
   methodName: string,
   statusCode: number,
   data: object | undefined
): MockedServiceFunction<typeof serviceModule[typeof methodName]> {
   const mockFunction = serviceModule[methodName] as MockedServiceFunction<typeof serviceModule[typeof methodName]>;
   mockFunction.mockResolvedValue({ statusCode, data });
   return mockFunction;
}

/**
 * Arranges a mock service function with validation error response in one line
 *
 * @param {any} serviceModule - The service module to mock
 * @param {string} methodName - The method name of the service to mock
 * @param {number} statusCode - HTTP status code
 * @param {Record<string, string>} errors - Validation errors
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} The mocked service function
 */
export function arrangeMockServiceValidationError(
   serviceModule: any,
   methodName: string,
   statusCode: number,
   errors: Record<string, string>
): MockedServiceFunction<typeof serviceModule[typeof methodName]> {
   const mockFunction = serviceModule[methodName] as MockedServiceFunction<typeof serviceModule[typeof methodName]>;
   mockFunction.mockResolvedValue({ statusCode, errors });
   return mockFunction;
}

/**
 * Arranges a mock service function that throws an error in one line
 *
 * @param {any} serviceModule - The service module to mock
 * @param {string} methodName - The method name of the service to mock
 * @param {Error} error - Error to throw
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} The mocked service function
 */
export function arrangeMockServiceError(
   serviceModule: any,
   methodName: string,
   error: Error
): MockedServiceFunction<any> {
   const mockFunction = serviceModule[methodName] as MockedServiceFunction<typeof serviceModule[typeof methodName]>;
   mockFunction.mockRejectedValue(error);
   return mockFunction;
}

/**
 * Calls a service method with proper type casting for Express middleware/controller functions
 *
 * @param {RequestHandler} serviceMethod - The Express RequestHandler (controller method) to call
 * @param {MockRequest} mockReq - Mock Express Request object
 * @param {MockResponse} mockRes - Mock Express Response object
 * @param {MockNextFunction} mockNext - Mock Express NextFunction
 * @returns {Promise<any>} The result of the service method call
 */
export async function callServiceMethod(
   serviceMethod: RequestHandler,
   mockReq: MockRequest,
   mockRes: MockResponse,
   mockNext: MockNextFunction
): Promise<any> {
   return await serviceMethod(mockReq as any, mockRes as any, mockNext as any);
}

/**
 * Asserts that a controller properly handled a service success by verifying both
 * the service call and the success response
 *
 * @param {Partial<Response>} mockRes - Mock response object
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function
 * @param {any[]} expectedServiceArgs - Expected arguments passed to the service function
 * @param {number} expectedStatusCode - Expected HTTP status code (`200`, `201`, or `204`)
 * @param {any} expectedData - Expected data to be sent in the response body
 */
export function assertControllerSuccessResponse(
   mockRes: Partial<Response>,
   mockServiceFunction: MockedServiceFunction<any>,
   expectedServiceArgs: any[],
   expectedStatusCode: number,
   expectedData: any
): void {
   // Verify the service function was called with the expected arguments
   expect(mockServiceFunction).toHaveBeenCalledWith(...expectedServiceArgs);

   // Verify the HTTP status code was set correctly
   expect(mockRes.status).toHaveBeenCalledWith(expectedStatusCode);

   if (expectedStatusCode === HTTP_STATUS.NO_CONTENT) {
      // For 204 responses, verify no JSON was sent to the client
      expect(mockRes.json).not.toHaveBeenCalled();
   } else {
      // For 200/201 responses, verify JSON was sent to the client with correct data
      expect(mockRes.json).toHaveBeenCalledWith({ data: expectedData });
   }

   // Always verify the response ends
   expect(mockRes.end).toHaveBeenCalled();
}

/**
 * Asserts that a controller properly handled an error by verifying both the
 * service call and the error response, handles both thrown errors and validation errors
 *
 * @param {Partial<Response>} mockRes - Mock response object
 * @param {Error | undefined} expectedError - Expected error that should be thrown by the service
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function
 * @param {any[]} [expectedServiceArgs] - Expected arguments passed to the service function
 * @param {number} [expectedStatusCode] - Expected HTTP status code (defaults to INTERNAL_SERVER_ERROR)
 * @param {Record<string, any>} [expectedErrors] - Expected error object (defaults to server error)
 */
export function assertControllerErrorResponse(
   mockRes: Partial<Response>,
   expectedError: Error | undefined,
   mockServiceFunction: MockedServiceFunction<any>,
   expectedServiceArgs?: any[],
   expectedStatusCode?: number,
   expectedErrors?: Record<string, any>
): void {
   const { logger } = require("@/lib/logger");

   // Verify the service function throws the expected error and properly logged the error stack
   if (expectedError) {
      expect(mockServiceFunction()).rejects.toThrow(expectedError);
      expect(logger.error).toHaveBeenCalledWith(expectedError.stack);
   }

   // If service args are provided, verify the service function was called with them
   if (expectedServiceArgs) {
      expect(mockServiceFunction).toHaveBeenCalledWith(...expectedServiceArgs);
   }

   // Use provided values or default to INTERNAL_SERVER_ERROR (500)
   const statusCode = expectedStatusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
   const errors = expectedErrors ?? { server: "Internal Server Error" };

   // Verify the controller handled the error response properly
   expect(mockRes.status).toHaveBeenCalledWith(statusCode);
   expect(mockRes.json).toHaveBeenCalledWith({ errors: errors });
   expect(mockRes.end).toHaveBeenCalled();
}

/**
 * Asserts that a controller properly handled a validation error by verifying both the service call and the error response
 *
 * @param {Partial<Response>} mockRes - Mock response object
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function
 * @param {any[]} expectedServiceArgs - Expected arguments passed to the service function
 * @param {number} expectedStatusCode - Expected HTTP status code
 * @param {Record<string, string>} expectedErrors - Expected error object
 */
export function assertControllerValidationErrorResponse(
   mockRes: Partial<Response>,
   mockServiceFunction: MockedServiceFunction<any>,
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