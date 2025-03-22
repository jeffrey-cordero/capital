export const getCurrentDate = () => {
   return new Date(new Date().setUTCHours(0, 0, 0, 0));
};

export const months = [
   "January", "February", "March", "April", "May", "June",
   "July", "August", "September", "October", "November", "December"
];

const monthAbbreviations = [
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

export function getYearAbbreviations(referenceDate = getCurrentDate()): string[] {
   // Format the year array to "MM. YYYY" format
   const year = [];

   for (const month of monthAbbreviations) {
      year.push(`${month} ${referenceDate.getUTCFullYear()}`);
   }

   return year;
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