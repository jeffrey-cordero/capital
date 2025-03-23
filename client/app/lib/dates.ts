import type { Period } from "capital/budgets";

export const getCurrentDate = () => {
   return new Date(new Date().setUTCHours(0, 0, 0, 0));
};

export const months = [
   "January", "February", "March", "April", "May", "June",
   "July", "August", "September", "October", "November", "December"
];

export const monthAbbreviations = [
   "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
   "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."
];

export function normalizeDate(date: string, view?: "MTD" | "YTD"): Date {
   // Assumes date is in YYYY-MM-DD format
   if (view === "MTD") {
      const [month, year] = date.split("/");

      return new Date(Number(year), Number(month) - 1, 1);
   } else if (view === "YTD") {
      return new Date(Number(date), 0, 1);
   } else {
      return new Date(new Date(`${date}T00:00:00`).setUTCHours(0, 0, 0, 0));
   }
}

export function getYearAbbreviations(year?: number): string[] {
   // Format the year array to "MM. YYYY" format
   const yearAbbreviations = [];
   const referenceDate = year ? new Date(year, 0, 1) : getCurrentDate();

   for (const month of monthAbbreviations) {
      yearAbbreviations.push(`${month} ${referenceDate.getUTCFullYear()}`);
   }

   return yearAbbreviations;
}

export function timeSinceLastUpdate(date: string) {
   // Calculate the time difference in milliseconds
   const difference = new Date().getTime() - new Date(date).getTime();

   // Convert to time units
   const minutes = Math.floor(difference / 60000);
   const hours = Math.floor(minutes / 60);
   const days = Math.floor(hours / 24);

   // Determine the appropriate output string
   if (minutes === 0) {
      return "now";
   } else {
      const parts = [];

      if (days >= 1) parts.push(`${days} day${days > 1 ? "s" : ""}`);
      if (hours >= 1 && hours % 24 !== 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? "s" : ""}`);
      if (minutes >= 1 && minutes % 60 !== 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? "s" : ""}`);

      return parts.join(", ") + " ago";
   }
}

export function calculateNewPeriod({ month, year }: Period, direction: "previous" | "next"): Period {
   if (direction === "previous") {
      return { month: month === 1 ? 12 : month - 1, year: month === 1 ? year - 1 : year };
   } else {
      return { month: month === 12 ? 1 : month + 1, year: month === 12 ? year + 1 : year };
   }
};

export function comparePeriods(p1: Period, p2: Period): -1 | 0 | 1 {
   // Returns 0 if the periods are the same, 1 if p1 is before p2, -1 if p1 is after p2
   if (p1.year === p2.year && p1.month === p2.month) {
      return 0;
   } else if (p1.year < p2.year || (p1.year === p2.year && p1.month < p2.month)) {
      return 1;
   } else {
      return -1;
   }
};