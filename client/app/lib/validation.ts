import type { UseFormSetError } from "react-hook-form";
import type { SafeParseReturnType } from "zod";

/**
 * Helper method to handle Zod schema validation errors
 *
 * @param {SafeParseReturnType<any, any>} fields - The fields to validate
 * @param {UseFormSetError<any>} setError - The setError function to set the error for the form leverage react-hook-form
 * @see {@link SafeParseReturnType}
 * @see {@link UseFormSetError}
 * @description
 * - Extracts the error messages from the Zod schema validation errors
 * - Sets the error as the first error message in the array of errors or `"Unknown Error"` if no errors are found
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