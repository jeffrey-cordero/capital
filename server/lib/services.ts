import { HTTP_STATUS, ServerResponse } from "capital/server";
import { Response } from "express";
import { SafeParseReturnType } from "zod";

import { logger } from "@/lib/logger";
import { removeCacheValue } from "@/lib/redis";
import { sendErrors, sendSuccess } from "@/lib/response";

/**
 * Formats validation errors with HTTP_STATUS.BAD_REQUEST based on Zod schema results.
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
         statusCode: HTTP_STATUS.BAD_REQUEST,
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field, errors?.at(0) || "Unknown error"
            ])
         )
      };
   } else {
      // Use predefined validation errors
      return {
         statusCode: HTTP_STATUS.BAD_REQUEST,
         errors: errors || {}
      };
   }
}

/**
 * Creates a structured service response with specified status code and data.
 *
 * @param {number} statusCode - HTTP status code
 * @param {any} [data] - Optional response data
 * @param {Record<string, string>} [errors] - Optional error details
 * @returns {ServerResponse} Formatted server response
 */
export function sendServiceResponse(statusCode: number, data?: any, errors?: Record<string, string>): ServerResponse {
   return {
      statusCode,
      data: data || undefined,
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

      if (result.statusCode === HTTP_STATUS.OK || result.statusCode === HTTP_STATUS.CREATED || result.statusCode === HTTP_STATUS.NO_CONTENT || result.data?.refreshable) {
         // Success response
         return sendSuccess(res, result.statusCode, result.data ?? undefined);
      } else {
         // Error response
         return sendErrors(res, result.statusCode, result.errors);
      }
   } catch (error: any) {
      // Log unexpected errors
      logger.error(error.stack);

      return sendErrors(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, { server: "Internal Server Error" });
   }
};

/**
 * Helper function to send a successful update response after clearing a cache key for strong consistency.
 *
 * @param {string} key - Cache key
 * @returns {Promise<ServerResponse>} A server response of `HTTP_STATUS.NO_CONTENT` with no content
 */
export const clearCacheAndSendSuccess = (key: string): ServerResponse => {
   removeCacheValue(key);
   return sendServiceResponse(HTTP_STATUS.NO_CONTENT);
};