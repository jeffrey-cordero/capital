import type { FieldValues, UseFormSetError } from "react-hook-form";
import type { SafeParseReturnType } from "zod";

// Helper method to handle Zod schema validation errors on form submission
export function handleValidationErrors(
   fields: SafeParseReturnType<any, any>,
   setError: UseFormSetError<FieldValues>
): void {
   const errors = fields.error?.flatten().fieldErrors;

   Object.entries(errors as Record<string, string[]>).map(([field, errors]) =>  {
      setError(field, {
         type: "manual",
         message: errors[0]
      });
   });

}