import type { BudgetPeriod } from "capital/budgets";

/**
 * Gets the current date in UTC
 * 
 * @returns {Date} The current date in UTC
 */
export const getCurrentDate = () => {
   return new Date(new Date().setUTCHours(0, 0, 0, 0));
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
 * Normalizes a date string based on the current view
 * 
 * @param {string} date - The date string
 * @param {string} [view] - The view to normalize the date for
 * @returns {Date} The normalized date
 * @description
 * - For MTD, the date string requires MM/YYYY format
 * - For YTD, the date string requires YYYY format
 * - Otherwise, the date string is assumed to be in YYYY-MM-DD format
 */
export function normalizeDate(date: string, view?: "MTD" | "YTD"): Date {
   // Assumes date is in YYYY-MM-DD format
   if (view === "MTD") {
      const [month, year] = date.split("/");

      return new Date(Number(year), Number(month) - 1, 1);
   } else if (view === "YTD") {
      return new Date(Number(date), 0, 1);
   } else {
      // Set time to midnight UTC
      return new Date(new Date(`${date}T00:00:00`).setUTCHours(0, 0, 0, 0));
   }
}

/**
 * Gets the year abbreviations
 * 
 * @param {number} [year] - The year
 * @returns {string[]} The year abbreviations in format "MM. YYYY"
 */
export function getYearAbbreviations(year?: number): string[] {
   // Format the year array to "MM. YYYY" format
   const referenceDate = year ? new Date(year, 0, 1) : getCurrentDate();

   return monthAbbreviations.map(month =>
      `${month} ${referenceDate.getUTCFullYear()}`
   );
}

/**
 * Calculates the time since the last update
 * 
 * @param {string} date - The date string
 * @returns {string} The time since the last update
 * @description
 * - Returns "now" for very recent updates
 * - Otherwise, returns the time since the last update in a human-readable format, such as "1 day ago" or "5 days, 2 hours ago"
 */
export function timeSinceLastUpdate(date: string): string {
   // Calculate the time difference in milliseconds
   const difference = new Date().getTime() - new Date(date).getTime();

   // Convert to time units
   const minutes = Math.floor(difference / 60000);
   const hours = Math.floor(minutes / 60);
   const days = Math.floor(hours / 24);

   // Return "now" for very recent updates
   if (minutes === 0) {
      return "now";
   }

   // Build parts of the time string
   const parts = [];
   if (days >= 1) parts.push(`${days} day${days > 1 ? "s" : ""}`);
   if (hours >= 1 && hours % 24 !== 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? "s" : ""}`);
   if (minutes >= 1 && minutes % 60 !== 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? "s" : ""}`);

   return parts.join(", ") + " ago";
}

/**
 * Calculates the new period
 * 
 * @param {BudgetPeriod} period - The current period
 * @param {string} direction - The direction to calculate the new period
 * @returns {BudgetPeriod} The new period
 * @description
 * - Calculates the new period based on the current period and the direction
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
 * Compares two budget periods
 * 
 * @param {BudgetPeriod} p1 - The first period
 * @param {BudgetPeriod} p2 - The second period
 * @returns {number} The comparison result
 * @description
 * - Returns -1 if p1 is before p2
 * - Returns 0 if p1 and p2 are the same
 * - Returns 1 if p1 is after p2
 */
export function compareBudgetPeriods(p1: BudgetPeriod, p2: BudgetPeriod): -1 | 0 | 1 {
   if (p1.year === p2.year && p1.month === p2.month) {
      // p1 and p2 are the same period
      return 0;
   } else if (p1.year < p2.year || (p1.year === p2.year && p1.month < p2.month)) {
      // p1 is before p2
      return 1;
   } else {
      // p1 is after p2
      return -1;
   }
}