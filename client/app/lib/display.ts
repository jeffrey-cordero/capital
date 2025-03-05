// Utility functions to ensure consistent formatting of server-provided values across the UI
export const ellipsis = {
   whiteSpace: "nowrap",
   overflow: "hidden",
   textOverflow: "ellipsis"
};

export function displayCurrency(value: number): string {
   const currency = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
   }).format(Math.abs(value));

   return value < 0 ? `-$${currency}` : `$${currency}`;
}

export function displayNumeric(value: number, decimals = true): string {
   return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0
   }).format(Math.abs(value));
}

export function displayPercentage(percentage: number): string {
   return new Intl.NumberFormat().format(Number(percentage.toFixed(2))) + "%";
}

export function displayDate(date: string): string {
   return new Date(date).toLocaleDateString("en-us", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      timeZone: "UTC"
   });
}