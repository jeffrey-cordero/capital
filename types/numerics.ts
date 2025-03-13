import { z } from "zod";

export const zodPreprocessNumber = (schema: z.ZodNumber) => {
   // Helper function to preprocess numbers for validation measures
   return z.preprocess(
      (value) => {
         if (value === null || value === undefined) {
            return NaN; // Force validation failure for null/undefined
         } else if (typeof value === "string") {
            const trimmed = value.trim();

            if (trimmed === "" || isNaN(Number(trimmed))) {
               return NaN; // Force validation failure for non-numeric strings
            }

            return Number(trimmed);
         } else if (typeof value === "number") {
            return value; // Return the original value if it's already a number
         } else {
            return NaN; // Force validation failure for other types
         }
      },
      schema
   );
}