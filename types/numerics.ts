import { z } from "zod";

/**
 * Helper function to preprocess numbers for validation measures.
 *
 * @param {z.ZodNumber} schema - The schema to preprocess
 * @returns {z.ZodEffects<any>} The preprocessed schema for further validation
 */
export const zodPreprocessNumber = (schema: z.ZodNumber): z.ZodEffects<any> => {
   // Helper function to preprocess numbers for validation measures
   return z.preprocess(
      (value) => {
         if (value === null || value === undefined) {
            return NaN; // Force validation failure for null/undefined
         } else if (typeof value === "string") {
            const trimmed = value.trim();
            const decimals = (value.toString().split('.')[1] || '').length;

            if (trimmed === "" || isNaN(Number(trimmed)) || decimals > 2) {
               return NaN; // Force validation failure for non-numeric strings
            }

            return Number(trimmed);
         } else if (typeof value === "number") {
            return value; // Return the original value if it's already a number
         } else {
            return NaN; // Force validation failure for other types
         }
      }, schema
   );
}