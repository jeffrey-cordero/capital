import { z } from "zod";

/**
 * Preprocesses numbers for validation measures.
 *
 * @param {z.ZodNumber} schema - The schema to preprocess
 * @returns {z.ZodEffects<any>} The preprocessed schema for further validation
 */
export const zodPreprocessNumber = (schema: z.ZodNumber): z.ZodEffects<any> => {
   return z.preprocess((value) => {
      if (value === null || value === undefined) {
         return NaN;
      } else if (typeof value === "string") {
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