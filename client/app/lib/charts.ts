import type { Theme } from "@mui/material";
import type { OrganizedBudget } from "capital/budgets";

/**
 * Calculate the percentage change between current and initial values
 *
 * @param {number} current - The current value
 * @param {number} initial - The initial value
 * @returns {number} The percentage change
 */
export function calculatePercentageChange(current: number, initial: number): number {
   if (initial === 0) return 0;

   return ((current - initial) / Math.abs(initial)) * 100;
}

/**
 * Calculate the totals for the budget
 *
 * @param {OrganizedBudget} budget - The budget to calculate the totals for
 * @returns {Object} The totals for the budget
 */
export function calculateBudgetTotals(budget: OrganizedBudget): { mainGoal: number, categoryTotal: number } {
   // Safely calculate the main goal amount with fallback to zero
   const mainGoal = Number(budget.goals[budget.goalIndex]?.goal || 0);

   // Sum up all category goals for the most recent month/year
   const categoryTotal = budget.categories.reduce((acc, category) => {
      const goalValue = Number(category.goals[category.goalIndex]?.goal || 0);
      return acc + goalValue;
   }, 0);

   return { mainGoal, categoryTotal };
}

/**
 * Gets the color of the graph based on the trend direction.
 *
 * @param {Theme} theme - The MUI theme
 * @param {number} value - The value of the graph
 * @returns {string} The color of the graph
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
 * Gets the color of the chip based on the trend direction.
 *
 * @param {number} trend - The trend of the graph
 * @returns {string} The color of the chip
 */
export function getChipColor(trend: number): string {
   if (trend === 0) {
      return "default" as const;
   } else if (trend > 0) {
      return "success" as const;
   } else {
      return "error" as const;
   }
}