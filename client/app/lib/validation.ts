import type { UseFormSetError } from "react-hook-form";
import type { SafeParseReturnType } from "zod";

/**
 * Processes Zod validation errors and applies them to form fields
 *
 * @param {SafeParseReturnType<any, any>} fields - Zod validation result containing potential errors
 * @param {UseFormSetError<any>} setError - React Hook Form's setError function for error handling
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