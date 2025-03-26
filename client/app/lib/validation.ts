import type { UseFormSetError } from "react-hook-form";
import type { SafeParseReturnType } from "zod";

/**
 * Helper method to handle Zod schema validation errors
 *
 * @param {SafeParseReturnType<any, any>} fields - The fields to validate
 * @param {UseFormSetError<any>} setError - The `setError` react-hook-form function to automate form error handling
 */
export function handleValidationErrors(
   fields: SafeParseReturnType<any, any>,
   setError: UseFormSetError<any>
): void {
   const errors: Record<string, string[] | undefined> = fields.error?.flatten().fieldErrors || {};

   Object.entries(errors).map(([field, errors]) =>  {
      setError(field, {
         type: "manual",
         message: errors?.at(0) || "Unknown Error"
      });
   });
}