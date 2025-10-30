import { HTTP_STATUS, ServerResponse } from "capital/server";
import { RequestHandler, Response } from "express";

import { logger } from "@/lib/logger";
import { sendErrors, sendSuccess } from "@/lib/response";
import { MockNextFunction, MockRequest, MockResponse } from "@/tests/utils/api";

/**
 * Mocked service function type
 *
 * @template T - Service function type
 * @returns {jest.MockedFunction<T>} Mocked function
 */
export type MockedServiceFunction<T extends (...args: unknown[]) => unknown> = jest.MockedFunction<T>;

/**
 * Create a mock submit service request function
 *
 * @returns {jest.Mock} Mock submit service request
 */
export function createMockSubmitServiceRequest(): jest.Mock {
   return jest.fn(async(mockRes: MockResponse, callback: () => Promise<ServerResponse>) => {
      // Ensure error logging is mocked for all service requests
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
 * Arrange a mock service function to return a success response
 *
 * @param {jest.Mocked<any>} serviceModule - Service module to mock
 * @param {string} methodName - Service method name
 * @param {number} statusCode - HTTP status code
 * @param {Object | undefined} data - Response data if any
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} Mocked function
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
 * Arrange a mock service function to return a validation error
 *
 * @param {jest.Mocked<any>} serviceModule - Service module to mock
 * @param {string} methodName - Service method name
 * @param {number} statusCode - HTTP status code
 * @param {Record<string, string>} errors - Validation errors
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} Mocked function
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
 * Arrange a mock service function to throw an error
 *
 * @param {jest.Mocked<any>} serviceModule - Service module to mock
 * @param {string} methodName - Service method name
 * @param {Error} error - Error to throw
 * @returns {MockedServiceFunction<typeof serviceModule[typeof methodName]>} Mocked function
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
 * Call a controller method with typed mocks
 *
 * @param {RequestHandler} serviceMethod - Controller method to call
 * @param {MockRequest} mockReq - Mock Request
 * @param {MockResponse} mockRes - Mock Response
 * @param {MockNextFunction} mockNext - Mock NextFunction
 * @returns {Promise<ServerResponse>} Result
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
 * Assert controller handled a service success
 *
 * @param {MockResponse} mockRes - Mock response
 * @param {MockedServiceFunction<any>} mockServiceFunction - Mocked service function called
 * @param {any[]} expectedServiceArgs - Expected service args
 * @param {number} expectedStatusCode - Expected HTTP status (`200`, `201`, `204`)
 * @param {any} expectedData - Expected response data
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
 * Assert controller handled an error response, handling both thrown errors and validation errors
 *
 * @param {MockResponse} mockRes - Mock response
 * @param {Error | undefined} expectedError - Expected thrown error
 * @param {MockedServiceFunction<any>} mockServiceFunction - Mocked service function
 * @param {any[]} expectedServiceArgs - Expected service args
 * @param {number} expectedStatusCode - Expected HTTP status
 * @param {Record<string, string>} expectedErrors - Expected error object
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