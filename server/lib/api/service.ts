import { ServerResponse } from "capital/server";
import { SafeParseReturnType } from "zod";

// Shared service logic for sending validation errors based on Zod schemas
export function sendValidationErrors(
   fields: SafeParseReturnType<any, any> | null,
   message: string, custom?:
   Record<string, string>
): ServerResponse {
   if (fields !== null) {
      // Zod schema validation errors
      const errors = fields.error?.flatten().fieldErrors;

      return {
         status: 400,
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
         status: 400,
         message: message,
         errors: custom || {}
      };
   }
}

// Shared service logic for sending server responses
export function sendServerResponse(status: number, message: string, data?: any, errors?: Record<string, string>): ServerResponse {
   return {
      status: status,
      message: message,
      data: data ?? undefined,
      errors: errors ?? undefined
   };
}