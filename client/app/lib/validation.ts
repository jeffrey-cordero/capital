import type { FieldValues, UseFormSetError } from "react-hook-form";
import type { SafeParseReturnType } from "zod";

// Helper method to handle Zod schema validation errors for each form submission
export function handleValidationErrors(
   fields: SafeParseReturnType<any, any>,
   setError: UseFormSetError<FieldValues>
): void {
   const errors: Record<string, string[] | undefined> = fields.error?.flatten().fieldErrors || {};

   Object.entries(errors).map(([field, errors]) =>  {
      setError(field, {
         type: "manual",
         message: errors?.at(0) || "Unknown error"
      });
   });
}