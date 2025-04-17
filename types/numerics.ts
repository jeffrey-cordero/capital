import { z } from "zod";

/**
 * Normalizes number inputs with precision handling
 *
 * @param schema - Zod number schema for validation
 * @returns Preprocessed schema with normalized numeric values
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