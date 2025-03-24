import { ServerResponse } from "capital/server";
import { Response } from "express";
import { SafeParseReturnType } from "zod";

import { logger } from "@/lib/logger";
import { sendErrors, sendSuccess } from "@/lib/response";

/**
 * Formats validation errors based on Zod schema validation results for API responses
 *
 * @param {SafeParseReturnType<any, any> | null} fields - Zod schema validation results (success = false)
 * @param {string} message - Error message to include in the response
 * @param {Record<string, string>} [errors] - Additional error details
 * @returns {ServerResponse} Validation errors response
 */
export function sendValidationErrors(
   fields: SafeParseReturnType<any, any> | null,
   message: string,
   errors?: Record<string, string>
): ServerResponse {
   if (fields !== null) {
      // Zod schema validation errors
      const errors: Record<string, string[] | undefined> = fields.error?.flatten().fieldErrors || {};

      return {
         code: 400,
         message: message,
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field, errors?.at(0) || "Unknown error"
            ])
         )
      };
   } else {
      // Custom validation errors
      return {
         code: 400,
         message: message,
         errors: errors || {}
      };
   }
}

/**
 * Sends a server response with the specified code, message, data, and errors
 *
 * @param {number} code - HTTP status code
 * @param {string} [message] - Optional message to include in the response
 * @param {any} [data] - Optional data to include in the response
 * @param {Record<string, string>} [errors] - Optional additional error details
 * @see {@link ServerResponse}
 * @returns {ServerResponse} Server response
 */
export function sendServiceResponse(code: number, message?: string, data?: any, errors?: Record<string, string>): ServerResponse {
   return {
      code: code,
      message: message || undefined,
      data: data ?? undefined,
      errors: errors || undefined
   };
}

/**
 * Submits a service request and handles the API response formatting
 *
 * @param {Response} res - Express response object to send the formatted response
 * @param {Function} serviceMethod - Async function to execute that returns service data
 * @returns {Promise<Response>} Express response after processing the service request
 * @description
 * - Executes the provided service method and formats the response
 * - Handles both successful responses and internal server errors
 * - Sets appropriate HTTP status codes and JSON response based on the outcome
 */
export const submitServiceRequest = async(
   res: Response,
   serviceMethod: () => Promise<ServerResponse>
): Promise<any> => {
   try {
      const result: ServerResponse = await serviceMethod();

      if (result.code === 200 || result.code === 201 || result.code === 204) {
         // Successful request with data or no content
         return sendSuccess(res, result.code, result.message, result.data ?? undefined);
      } else {
         // Validation errors and/or potential database conflicts
         return sendErrors(res, result.code, result.message, result.errors);
      }
   } catch (error: any) {
      logger.error(error.stack);

      return sendErrors(res, 500, "Internal Server Error",
         { server: error.message || error.code || "An unknown error occurred" }
      );
   }
};