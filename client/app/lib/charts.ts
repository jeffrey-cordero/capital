import type { Theme } from "@mui/material";

/**
 * Calculates percent change between two values
 *
 * @param {number} current - Current value
 * @param {number} initial - Initial reference value
 * @returns {number} Percentage change (0 if initial is zero)
 */
export function calculatePercentageChange(current: number, initial: number): number {
   if (initial === 0) return 0;

   return ((current - initial) / Math.abs(initial)) * 100;
}

/**
 * Determines graph color based on value trend
 *
 * @param {Theme} theme - Material UI theme object
 * @param {number} value - Numeric value to evaluate
 * @returns {string} Appropriate theme color based on value
 */
export function getGraphColor(theme: Theme, value: number): string {
   if (value === 0) {
      return theme.palette.text.primary;
   } else if (value > 0) {
      return theme.palette.success.main;
   } else {
      return theme.palette.error.main;
   }
}

/**
 * Gets semantic chip color for trend indicators
 *
 * @param {number} trend - Trend value to evaluate
 * @returns {"default" | "success" | "error"} Chip color variant (default, success, or error)
 */
export function getChipColor(trend: number): "default" | "success" | "error" {
   if (trend === 0) {
      return "default" as const;
   } else if (trend > 0) {
      return "success" as const;
   } else {
      return "error" as const;
   }
}