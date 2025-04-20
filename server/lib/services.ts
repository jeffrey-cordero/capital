import { ServerResponse } from "capital/server";
import { Response } from "express";
import { SafeParseReturnType } from "zod";

import { logger } from "@/lib/logger";
import { sendErrors, sendSuccess } from "@/lib/response";
import { removeCacheValue } from "@/lib/redis";

/**
 * Formats validation errors with a 400 status code based on Zod schema results.
 *
 * @param {SafeParseReturnType<any, any> | null} fields - Zod validation results or null
 * @param {Record<string, string>} [errors] - Optional prepared error messages (used when fields is null)
 * @returns {ServerResponse} Validation errors response
 */
export function sendValidationErrors(
   fields: SafeParseReturnType<any, any> | null,
   errors?: Record<string, string>
): ServerResponse {
   if (fields !== null) {
      // Extract Zod validation errors
      const errors = fields.error?.flatten().fieldErrors || {};

      return {
         code: 400,
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field, errors?.at(0) || "Unknown error"
            ])
         )
      };
   } else {
      // Use predefined validation errors
      return {
         code: 400,
         errors: errors || {}
      };
   }
}

/**
 * Creates a structured service response with specified status code and data.
 *
 * @param {number} code - HTTP status code
 * @param {any} [data] - Optional response data
 * @param {Record<string, string>} [errors] - Optional error details
 * @returns {ServerResponse} Formatted server response
 */
export function sendServiceResponse(code: number, data?: any, errors?: Record<string, string>): ServerResponse {
   return {
      code: code,
      data: data ?? undefined,
      errors: errors || undefined
   };
}

/**
 * Handles service requests and formats API responses with global error handling.
 *
 * @param {Response} res - Express response object
 * @param {Function} serviceMethod - Async function containing the service logic
 */
export const submitServiceRequest = async(
   res: Response,
   serviceMethod: () => Promise<ServerResponse>
): Promise<void> => {
   try {
      const result: ServerResponse = await serviceMethod();

      if (result.code === 200 || result.code === 201 || result.code === 204) {
         // Success response
         return sendSuccess(res, result.code, result.data ?? undefined);
      } else {
         // Error response
         return sendErrors(res, result.code, result.errors);
      }
   } catch (error: any) {
      // Log unexpected errors
      logger.error(error.stack);

      return sendErrors(res, 500, { server: "Internal Server Error" });
   }
};

/**
 * Helper function to send a successful update response after clearing a cache key for strong consistency.
 *
 * @param {string} key - Cache key
 * @returns {Promise<ServerResponse>} A server response of `204` with no content
 */
export const clearCacheAndSendSuccess = (key: string): ServerResponse => {
   removeCacheValue(key);
   return sendServiceResponse(204);
};
