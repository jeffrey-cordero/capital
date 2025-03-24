/**
 * Utility methods to ensure consistent formatting for values across the various components
 */
export const ellipsis = {
   whiteSpace: "nowrap",
   overflow: "hidden",
   textOverflow: "ellipsis"
};

/**
 * Helper function for formatting numbers
 *
 * @param {number} value - The value to format
 * @param {number} minFraction - Minimum number of fraction digits
 * @param {number} maxFraction - Maximum number of fraction digits
 * @returns {string} The formatted number
 */
function formatNumber(value: number, minFraction: number = 2, maxFraction: number = 2): string {
   return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction
   }).format(Math.abs(value));
}

/**
 * Displays a currency value, such as `-$1,234.56` or `$1,234.56`
 *
 * @param {number} value - The value to display
 * @returns {string} The formatted currency value
 */
export function displayCurrency(value: number): string {
   return value < 0 ? `-$${formatNumber(value)}` : `$${formatNumber(value)}`;
}

/**
 * Displays a numeric value, such as `1,234.56`
 *
 * @param {number} value - The value to display
 * @param {boolean} [decimals] - Whether to display decimals
 * @returns {string} The formatted numeric value
 */
export function displayNumeric(value: number, decimals: boolean = true): string {
   return formatNumber(value, decimals ? 2 : 0);
}

/**
 * Displays a percentage value, such as `12.34%`
 *
 * @param {number} percentage - The percentage to display
 * @returns {string} The formatted percentage value
 */
export function displayPercentage(percentage: number): string {
   return formatNumber(percentage, 2) + "%";
}

/**
 * Displays a volume value, such as `1.2B`, `1.2M`, and `1.2K`
 *
 * @param {number} volume - The volume to display
 * @returns {string} The formatted volume value
 */
export function displayVolume(volume: number): string {
   if (volume >= 1_000_000_000) {
      return (volume / 1_000_000_000).toFixed(1) + "B";
   } else if (volume >= 1_000_000) {
      return (volume / 1_000_000).toFixed(1) + "M";
   } else if (volume >= 1_000) {
      return (volume / 1_000).toFixed(1) + "K";
   } else {
      return volume.toString();
   }
}

/**
 * Displays a localized date value, such as `01/01/2024`
 *
 * @param {string} date - The date to display
 * @returns {string} The formatted date value
 */
export function displayDate(date: string): string {
   return new Date(date).toLocaleDateString("en-us", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      timeZone: "UTC"
   });
}