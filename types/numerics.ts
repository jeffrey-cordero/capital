import { z } from "zod";

/**
 * Standardizes number inputs for validation with precision handling, which
 * ensures consistent numeric format and decimal precision for currency values
 * with protection against invalid input formats.
 *
 * @param schema - Zod number schema for subsequent validation
 * @returns Preprocessed Zod schema with normalized numeric values
 */
export const zodPreprocessNumber = (schema: z.ZodNumber): z.ZodEffects<any> => {
   return z.preprocess((value) => {
      if (value === null || value === undefined) {
         return NaN;
      } else if (typeof value === "string") {
         // Ensure at most two decimal places
         const input: string = value.trim();
         const decimals: number = (value.toString().split('.')[1] || '').length;

         if (input === "" || isNaN(Number(input)) || decimals > 2) {
            return NaN;
         }

         return Number(input);
      } else if (typeof value === "number") {
         return value;
      } else {
         return NaN;
      }
   }, schema);
}