import { ServerResponse } from "capital/server";
import { Response } from "express";
import { SafeParseReturnType } from "zod";

import { logger } from "@/lib/logger";
import { sendErrors, sendSuccess } from "@/lib/response";

// Shared service logic for sending validation errors based on Zod schemas
export function sendValidationErrors(
   fields: SafeParseReturnType<any, any> | null,
   message: string,
   errors?: Record<string, string>
): ServerResponse {
   if (fields !== null) {
      // Zod schema validation errors
      const errors = fields.error?.flatten().fieldErrors;

      return {
         code: 400,
         message: message,
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field, errors?.[0] || "Unknown error"
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

// Shared service logic for sending server responses
export function sendServiceResponse(code: number, message: string, data?: any, errors?: Record<string, string>): ServerResponse {
   return {
      code: code,
      message: message,
      data: data ?? undefined,
      errors: errors || undefined
   };
}

// Shared controller logic for returning content from service requests or handling potential errors
export async function submitServiceRequest(res: Response, serviceMethod: () => Promise<ServerResponse>) {
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
}