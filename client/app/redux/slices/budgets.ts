import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type BudgetCategory, type BudgetGoals, type OrganizedBudgets } from "capital/budgets";

import { getCurrentDate } from "@/lib/dates";

type Period = { month: number, year: number };

const calculateNewPeriod = (month: number, year: number, direction: "previous" | "next"): Period => {
   if (direction === "previous") {
      return { month: month === 1 ? 12 : month - 1, year: month === 1 ? year - 1 : year };
   } else {
      return { month: month === 12 ? 1 : month + 1, year: month === 12 ? year + 1 : year };
   }
};

export const comparePeriods = (period1: Period, period2: Period): number => {
   // Return 0 if the periods are the same, 1 if period1 is before period2, and -1 if period1 is after period2
   if (period1.year === period2.year && period1.month === period2.month) {
      return 0;
   } else if (period1.year < period2.year || (period1.year === period2.year && period1.month < period2.month)) {
      return 1;
   } else {
      return -1;
   }
};

const today = getCurrentDate();

const budgetsSlice = createSlice({
   name: "budgets",
   initialState: {
      value: {
         Income: { goals: [], goalIndex: 0, budget_category_id: "", categories: [], categoriesMap: {} },
         Expenses: { goals: [], goalIndex: 0, budget_category_id: "", categories: [], categoriesMap: {} },
         period: { month: today.getUTCMonth() + 1, year: today.getUTCFullYear() }
      } as OrganizedBudgets
   },
   reducers: {
      setBudgets(state, action: PayloadAction<OrganizedBudgets>) {
         state.value = action.payload;
      },
      updateBudget(state, action: PayloadAction<{ type: "Income" | "Expenses", budget_category_id: string, goal: number }>) {
         // Fetch the current month and year
         const { month, year } = state.value.period;

         // Extract the updates from the payload
         const { type, budget_category_id, goal } = action.payload;

         // Get the category
         const category = state.value[type].categories.find(c => c.budget_category_id === budget_category_id);

         if (!category) return;

         // Fetch the existing goals for the category
         const currentGoal = category.goals[category.goalIndex];

         // Calculate the difference in time periods between the current goal and the new goal
         const timePeriodDifference = comparePeriods(currentGoal, { month, year });

         if (timePeriodDifference !== 0) {
            // Move forward for previous periods or stay at the current index for a valid future period
            const increment = timePeriodDifference === 1 ? 1 : 0;

            // Insert the new goal at the correct position
            category.goals.splice(category.goalIndex + increment, 0, { year, month, goal });

            // Update the goal index
            category.goalIndex += increment;
            return;
         }

         // Update the existing goal
         category.goals[category.goalIndex].goal = goal;
      },
      addBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         category: BudgetCategory & { goals: BudgetGoals[] }
      }>) {
         const { type, category } = action.payload;

         // Add the new category and store its index for future lookups
         state.value[type].categories.push(category);
      },
      updateBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         updates: Partial<BudgetCategory> & { budget_category_id: string }
      }>) {
         // Extract the updates from the payload
         const { type, updates } = action.payload;

         // Get the category index and category
         const categoryIndex = state.value[type].categories.findIndex(c => c.budget_category_id === updates.budget_category_id);
         const category = state.value[type].categories[categoryIndex];

         if (!category) return;

         // Handle changes in category type
         if (updates.type && updates.type !== category.type) {
            // Remove the category from the current type
            state.value[category.type].categories.splice(categoryIndex, 1);

            // Add the category to the new type
            state.value[updates.type].categories.push(category);
         }

         // Update the category with the new values
         Object.assign(category, { ...category, ...updates });

      },
      removeBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         budget_category_id: string
      }>) {
         const { type, budget_category_id } = action.payload;

         // Remove the category from the categories array
         const categoryIndex = state.value[type].categories.findIndex(c => c.budget_category_id === budget_category_id);
         state.value[type].categories.splice(categoryIndex, 1);
      },
      selectMonth: (state, action: PayloadAction<{ direction: "previous" | "next" }>) => {
         // Fetch the current date in case it has changed from the original state
         const today = getCurrentDate();

         if (action.payload.direction === "next"
            && state.value.period.month === today.getUTCMonth() + 1
            && state.value.period.year === today.getUTCFullYear()) {
            // Ignore future period selections
            return;
         }

         const { direction } = action.payload;
         const { month, year } = calculateNewPeriod(state.value.period.month, state.value.period.year, direction);

         // Update the period state
         state.value.period.month = month;
         state.value.period.year = year;

         // Update index for each category
         for (const type of ["Income", "Expenses"] as const) {
            // Handle updating the main category's goal index
            const mainIndex = state.value[type].goalIndex;
            const maxIndex = direction === "next" ?  0 : state.value[type].goals.length - 1;

            if (mainIndex !== maxIndex) {
               const currentGoal = state.value[type].goals[mainIndex];
               const newGoal = state.value[type].goals[mainIndex + (direction === "next" ? -1 : 1)];

               if (direction === "previous" && (currentGoal.year > year || (currentGoal.year === year && currentGoal.month > month))) {
                  // Increment to previous only if the current category period is in a future period
                  state.value[type].goalIndex++;
               }

               if (direction === "next" && newGoal.year === year && newGoal.month === month) {
                  // Only decrement to the exact period or carry over the current period
                  state.value[type].goalIndex--;
               }
            }

            // Handle each category's goal index
            for (const category of state.value[type].categories) {
               const categoryIndex = category.goalIndex;
               const maxCategoryIndex = direction === "next" ? 0 : category.goals.length - 1;

               if (categoryIndex !== maxCategoryIndex) {
                  const currentGoal = category.goals[categoryIndex];
                  const newGoal = category.goals[categoryIndex + (direction === "next" ? -1 : 1)];

                  if (direction === "previous" && (currentGoal.year > year || (currentGoal.year === year && currentGoal.month > month))) {
                     // Always increment to the previous period
                     category.goalIndex++;
                  }

                  if (direction === "next" && newGoal.year === year && newGoal.month === month) {
                     // Only decrement once we hit the exact incrementing period
                     category.goalIndex--;
                  }
               }
            }
         }
      }
   }
});

export const { setBudgets, updateBudget, addBudgetCategory, updateBudgetCategory, removeBudgetCategory, selectMonth } = budgetsSlice.actions;

export default budgetsSlice.reducer;