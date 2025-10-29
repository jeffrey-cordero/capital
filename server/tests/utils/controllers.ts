import { HTTP_STATUS, ServerResponse } from "capital/server";
import { RequestHandler, Response } from "express";

import { logger } from "@/lib/logger";
import { sendErrors, sendSuccess } from "@/lib/response";
import { MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";

/**
 * Mocked service function type for type casting purposes
 *
 * @template T - The type of the service function
 * @returns {jest.MockedFunction<T>} The mocked service function
 */
export type MockedServiceFunction<T extends (...args: unknown[]) => unknown> = jest.MockedFunction<T>;

/**
 * Arranges a mock submit service request function as all services are mocked to test
 * the controller flow in isolation
 *
 * @returns {jest.Mock} Mock submit service request function
 */
export function createMockSubmitServiceRequest(): jest.Mock {
   return jest.fn(async(mockRes: MockResponse, callback: () => Promise<ServerResponse>) => {
      // Make sure error logging is mocked for all service requests
      logger.error = jest.fn();

      try {
         const result: ServerResponse = await callback();

         if (result.statusCode === HTTP_STATUS.OK || result.statusCode === HTTP_STATUS.CREATED || result.statusCode === HTTP_STATUS.NO_CONTENT || result.data?.refreshable) {
            // Success response
            return sendSuccess(mockRes as Response, result.statusCode, result.data ?? undefined);
         } else {
            // Error response
            return sendErrors(mockRes as Response, result.statusCode, result.errors);
         }
      } catch (error: any) {
         // Log unexpected errors
         logger.error(error.stack);

         return sendErrors(mockRes as Response, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
      }
   });
}

/**
 * Arranges a mock service function to return a successful response
 *
 * @param {jest.Mocked<any>} serviceModule - The service module to mock
 * @param {string} methodName - The method name of the service to mock
 * @param {number} statusCode - HTTP status code of the response
 * @param {Object | undefined} data - Response data, if applicable
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} The mocked service function
 */
export function arrangeMockServiceSuccess(
   serviceModule: jest.Mocked<any>,
   methodName: string,
   statusCode: number,
   data: object | undefined
): MockedServiceFunction<typeof serviceModule[typeof methodName]> {
   const mockFunction = serviceModule[methodName] as MockedServiceFunction<typeof serviceModule[typeof methodName]>;
   mockFunction.mockResolvedValue({ statusCode, data });

   return mockFunction;
}

/**
 * Arranges a mock service function to return a validation error response
 *
 * @param {jest.Mocked<any>} serviceModule - The service module to mock
 * @param {string} methodName - The method name of the service to mock
 * @param {number} statusCode - HTTP status code
 * @param {Record<string, string>} errors - Validation errors
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} The mocked service function
 */
export function arrangeMockServiceValidationError(
   serviceModule: jest.Mocked<any>,
   methodName: string,
   statusCode: number,
   errors: Record<string, string>
): MockedServiceFunction<typeof serviceModule[typeof methodName]> {
   const mockFunction = serviceModule[methodName] as MockedServiceFunction<typeof serviceModule[typeof methodName]>;
   mockFunction.mockResolvedValue({ statusCode, errors });

   return mockFunction;
}

/**
 * Arranges a mock service function to throw an error
 *
 * @param {jest.Mocked<any>} serviceModule - The service module to mock
 * @param {string} methodName - The method name of the service to mock
 * @param {Error} error - Error to throw
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} The mocked service function
 */
export function arrangeMockServiceError(
   serviceModule: jest.Mocked<any>,
   methodName: string,
   error: Error
): MockedServiceFunction<typeof serviceModule[typeof methodName]> {
   const mockFunction = serviceModule[methodName] as MockedServiceFunction<typeof serviceModule[typeof methodName]>;
   mockFunction.mockRejectedValue(error);

   return mockFunction;
}

/**
 * Calls a mocked service method with proper type casting for Express middleware/controller
 * functions to avoid type errors when calling service methods in unit tests
 *
 * @param {RequestHandler} serviceMethod - The Express RequestHandler (controller method) to call
 * @param {MockRequest} mockReq - Mock Express Request object
 * @param {MockResponse} mockRes - Mock Express Response object
 * @param {MockNextFunction} mockNext - Mock Express NextFunction
 * @returns {Promise<ServerResponse>} The result of the mocked service method call
 */
export async function callServiceMethod(
   serviceMethod: RequestHandler,
   mockReq: MockRequest,
   mockRes: MockResponse,
   mockNext: MockNextFunction
): Promise<ServerResponse> {
   return await serviceMethod(mockReq as any, mockRes as any, mockNext as any) as ServerResponse;
}

/**
 * Asserts that a controller properly handled a service success by verifying both
 * the mocked service call and the success response
 *
 * @param {MockResponse} mockRes - Mock response object
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function that was called
 * @param {any[]} expectedServiceArgs - Expected arguments passed to the mocked service function that was called
 * @param {number} expectedStatusCode - Expected HTTP status code (`200`, `201`, or `204`)
 * @param {any} expectedData - Expected data to be sent in the mocked response body that was called
 */
export function assertControllerSuccessResponse(
   mockRes: MockResponse,
   mockServiceFunction: MockedServiceFunction<any>,
   expectedServiceArgs: any[],
   expectedStatusCode: number,
   expectedData: any
): void {
   // Assert the mocked service function was called with the expected arguments
   expect(mockServiceFunction).toHaveBeenCalledWith(...expectedServiceArgs);

   // Assert the mocked response status code was set correctly
   expect(mockRes.status).toHaveBeenCalledWith(expectedStatusCode);

   if (expectedStatusCode === HTTP_STATUS.NO_CONTENT) {
      // Assert no JSON was sent to the mocked response
      expect(mockRes.json).not.toHaveBeenCalled();
   } else {
      // Assert JSON was sent to the mocked response body with correct data
      expect(mockRes.json).toHaveBeenCalledWith({ data: expectedData });
   }

   // Assert the mocked response ends at this service method call
   expect(mockRes.end).toHaveBeenCalled();
}

/**
 * Asserts that a controller properly handled an error response by verifying both the
 * mocked service call and the error response, handles both thrown errors and validation errors
 *
 * @param {MockResponse} mockRes - Mock response object
 * @param {Error | undefined} expectedError - Expected error that should be thrown by the mocked service function that was called
 * @param {MockedServiceFunction<any>} mockServiceFunction - The mocked service function
 * @param {any[]} expectedServiceArgs - Expected arguments passed to the mocked service function that was called
 * @param {number} expectedStatusCode - Expected HTTP status code (defaults to mocked `HTTP_STATUS.INTERNAL_SERVER_ERROR`)
 * @param {Record<string, string>} expectedErrors - Expected error object (defaults to mocked `{ server: "Internal Server Error" }`)
 */
export function assertControllerErrorResponse(
   mockRes: MockResponse,
   expectedError: Error | undefined,
   mockServiceFunction: MockedServiceFunction<any>,
   expectedServiceArgs: any[],
   expectedStatusCode: number,
   expectedErrors: Record<string, string>
): void {
   // Assert the mocked service function throws the expected error and properly logs the error stack
   if (expectedError) {
      expect(mockServiceFunction()).rejects.toThrow(expectedError);
      expect(logger.error).toHaveBeenCalledWith(expectedError.stack);
   }

   // If mocked service args are provided, assert the mocked service function was called with them
   if (expectedServiceArgs.length > 0) {
      expect(mockServiceFunction).toHaveBeenCalledWith(...expectedServiceArgs);
   }

   // Assert the mocked response status code and errors were set correctly
   expect(mockRes.status).toHaveBeenCalledWith(expectedStatusCode);
   expect(mockRes.json).toHaveBeenCalledWith({ errors: expectedErrors });

   // Assert the mocked response ends at this service method call
   expect(mockRes.end).toHaveBeenCalled();
}