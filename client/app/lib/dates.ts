import type { BudgetPeriod } from "capital/budgets";

/**
 * Gets current date in UTC at midnight
 *
 * @returns {Date} Current UTC date with zeroed time
 */
export function getCurrentDate(): Date {
   return new Date(new Date().setUTCHours(0, 0, 0, 0));
};

/**
 * Returns valid date range boundaries in ISO format
 *
 * @returns {[string, string]} Array containing min and max valid dates
 */
export function getValidDateRange(): [string, string] {
   return [
      new Date("1800-01-01").toISOString().split("T")[0],
      new Date(new Date().toLocaleString(
         "en-US", { timeZone: "Pacific/Kiritimati" }
      )).toISOString().split("T")[0]
   ];
};

/**
 * Full month names
 */
export const months = [
   "January", "February", "March", "April", "May", "June",
   "July", "August", "September", "October", "November", "December"
];

/**
 * Abbreviated month names with periods
 */
export const monthAbbreviations = [
   "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
   "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."
];

/**
 * Converts date string to Date object based on view type, which includes
 * MTD (MM/YYYY), YTD (YYYY), or standard (YYYY-MM-DD)
 *
 * @param {string} date - Date string to normalize
 * @param {("MTD"|"YTD")} [view] - Optional view type that affects parsing format
 * @returns {Date} Normalized Date object
 */
export function normalizeDate(date: string, view?: "MTD" | "YTD"): Date {
   if (view === "MTD") {
      const [month, year] = date.split("/");

      return new Date(Number(year), Number(month) - 1, 1);
   } else if (view === "YTD") {
      return new Date(Number(date), 0, 1);
   } else {
      return new Date(`${date}T00:00:00`);
   }
}

/**
 * Generates month abbreviations with specified year
 *
 * @param {number} [year] - Optional year for abbreviations (defaults to current year)
 * @returns {string[]} Array of formatted month-year strings ("MM. YYYY")
 */
export function getYearAbbreviations(year?: number): string[] {
   const referenceDate = year ? new Date(year, 0, 1) : getCurrentDate();

   return monthAbbreviations.map(month =>
      `${month} ${referenceDate.getUTCFullYear()}`
   );
}

/**
 * Formats elapsed time in human-readable format
 *
 * @param {string} date - Reference date to calculate time from
 * @returns {string} Formatted string (e.g., "now", "1 day ago", "5 days, 2 hours ago")
 */
export function timeSinceLastUpdate(date: string): string {
   // Calculate the time difference in milliseconds
   const difference = new Date().getTime() - new Date(date).getTime();

   // Convert to time units
   const minutes = Math.floor(difference / 60000);
   const hours = Math.floor(minutes / 60);
   const days = Math.floor(hours / 24);

   // Return "now" for very recent updates
   if (minutes === 0) return "now";

   // Build parts of the time string
   const parts = [];
   if (days >= 1) {
      parts.push(`${days} day${days > 1 ? "s" : ""}`);
   }

   if (hours >= 1 && hours % 24 !== 0) {
      parts.push(`${hours % 24} hour${hours % 24 > 1 ? "s" : ""}`);
   }

   if (minutes >= 1 && minutes % 60 !== 0) {
      parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? "s" : ""}`);
   }

   return parts.join(", ") + " ago";
}

/**
 * Calculates adjacent budget period based on direction
 *
 * @param {BudgetPeriod} period - Current budget period (month/year)
 * @param {("previous"|"next")} direction - Direction to move (previous or next)
 * @returns {BudgetPeriod} New budget period
 */
export function calculateNewBudgetPeriod({ month, year }: BudgetPeriod, direction: "previous" | "next"): BudgetPeriod {
   if (direction === "previous") {
      return {
         month: month === 1 ? 12 : month - 1,
         year: month === 1 ? year - 1 : year
      };
   } else {
      return {
         month: month === 12 ? 1 : month + 1,
         year: month === 12 ? year + 1 : year
      };
   }
}

/**
 * Compares two budget periods chronologically
 *
 * @param {BudgetPeriod} p1 - First budget period
 * @param {BudgetPeriod} p2 - Second budget period
 * @returns {("before"|"equal"|"after")} "before" (p1 earlier than p2), "equal" (same period), or "after" (p1 later than p2)
 */
export function compareBudgetPeriods(p1: BudgetPeriod, p2: BudgetPeriod): "before" | "equal" | "after" {
   if (p1.year === p2.year && p1.month === p2.month) {
      return "equal";
   } else if (p1.year < p2.year || (p1.year === p2.year && p1.month < p2.month)) {
      return "before";
   } else {
      return "after";
   }
}