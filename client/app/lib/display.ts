import type { Theme } from "@mui/material";

import { normalizeDate } from "@/lib/dates";

/**
 * CSS for horizontally scrollable text container with styled scrollbar
 */
export const horizontalScroll = (theme: Theme) => ({
   whiteSpace: "nowrap",
   overflowX: "auto",
   overflowY: "hidden",
   scrollbarWidth: "none",
   "&::-webkit-scrollbar": {
      height: "0px",
      transition: "height 0.5s ease"
   },
   "&:hover": {
      scrollbarWidth: "thin",
      "&::-webkit-scrollbar": {
         height: "5px",
         scrollbarWidth: "auto"
      },
      "&::-webkit-scrollbar-thumb": {
         backgroundColor: theme.palette.grey[400],
         borderRadius: "4px"
      }
   }
});

/**
 * Standardizes number formatting with locale and decimal precision
 *
 * @param {number} value - Number to format
 * @param {number} minFraction - Minimum decimal digits
 * @param {number} maxFraction - Maximum decimal digits
 * @param {boolean} absolute - Whether to use absolute value
 * @returns {string} Formatted number string
 */
export function formatNumber(value: number, minFraction: number = 2, maxFraction: number = 2, absolute: boolean = true): string {
   return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction
   }).format(absolute ? Math.abs(value) : value);
}

/**
 * Formats number as currency with dollar sign
 *
 * @param {number} value - Monetary value to format
 * @returns {string} Formatted currency string (e.g., -$1,234.56 or $1,234.56)
 */
export function displayCurrency(value: number): string {
   return value < 0 ? `-$${formatNumber(value)}` : `$${formatNumber(value)}`;
}

/**
 * Formats number with thousands separators
 *
 * @param {number} value - Number to format
 * @param {boolean} [decimals=true] - Whether to include decimal places
 * @returns {string} Formatted number (e.g., 1,234.56 or 1,234)
 */
export function displayNumeric(value: number, decimals: boolean = true): string {
   return formatNumber(value, decimals ? 2 : 0);
}

/**
 * Formats number as percentage
 *
 * @param {number} percentage - Percentage value to format
 * @returns {string} Formatted percentage with % symbol
 */
export function displayPercentage(percentage: number): string {
   return formatNumber(percentage, 2) + "%";
}

/**
 * Formats large numbers with metric suffixes
 *
 * @param {number} volume - Number to format
 * @returns {string} Formatted with K, M, or B suffix as appropriate
 */
export function displayVolume(volume: number): string {
   let result: string = "";
   const normalized: number = Math.abs(volume);

   if (normalized >= 1_000_000_000) {
      result = (normalized / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
   } else if (normalized >= 1_000_000) {
      result = (normalized / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
   } else if (normalized >= 1_000) {
      result = (normalized / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
   } else {
      result = normalized.toString();
   }

   return volume < 0 ? `-${result}` : result;
}

/**
 * Formats date as localized string
 *
 * @param {string} date - ISO date string to format
 * @returns {string} Formatted date (MM/DD/YYYY)
 */
export function displayDate(date: string): string {
   return normalizeDate(date.split("T")[0]).toLocaleDateString("en-us", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
   });
}