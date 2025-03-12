import { z } from "zod";

export const zodPreprocessNumber = (schema: z.ZodNumber) => {
   // Helper function to preprocess numbers for validation measures
   return z.preprocess(
      (value) => {
         if (typeof value === "string" && (value.trim() === "" || isNaN(Number(value)))) {
            return NaN; // Force validation failure for non-numeric strings
         } else {
            return Number(value); // Otherwise, return the original value
         }
      },
      schema
   );
}