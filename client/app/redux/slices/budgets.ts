import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type BudgetCategory, type OrganizedBudgets } from "capital/budgets";

import { getCurrentDate } from "@/lib/dates";

type Period = { month: number, year: number };

const calculateNewPeriod = ({ month, year }: Period, direction: "previous" | "next"): Period => {
   if (direction === "previous") {
      return { month: month === 1 ? 12 : month - 1, year: month === 1 ? year - 1 : year };
   } else {
      return { month: month === 12 ? 1 : month + 1, year: month === 12 ? year + 1 : year };
   }
};

export const comparePeriods = (p1: Period, p2: Period): number => {
   // Return 0 if the periods are the same, 1 if p1 is before p2, and -1 if p1 is after p2
   if (p1.year === p2.year && p1.month === p2.month) {
      return 0;
   } else if (p1.year < p2.year || (p1.year === p2.year && p1.month < p2.month)) {
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
         const { type, budget_category_id, goal } = action.payload;
         const { month, year } = state.value.period;
         const isMainCategory = state.value[type].budget_category_id === budget_category_id;

         // Get the respective category
         const category = isMainCategory ? state.value[type] : state.value[type].categories.find(
            c => c.budget_category_id === budget_category_id
         );

         if (!category) return; // Ignore invalid categories

         // Calculate the difference in time periods between the current goal and the new goal periods
         const timePeriodDifference = comparePeriods(category.goals[category.goalIndex], { month, year });

         if (timePeriodDifference !== 0) {
            // Handle new budgets that are either closer or further from current goal record
            const goalIndexIncrement = timePeriodDifference === 1 ? 1 : 0; // Closer periods remain at the same index
            const goalIndexAdjustment = Math.max(0, category.goalIndex + goalIndexIncrement);

            // Insert the new goal record
            category.goals.splice(goalIndexAdjustment, 0, { year, month, goal });

            // Update the goal index accordingly
            category.goalIndex = goalIndexAdjustment;
            return;
         }

         // Update the existing goal record
         category.goals[category.goalIndex].goal = goal;
      },
      updateBudgetCategoryOrder(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         categories: BudgetCategory[]
      }>) {
         const { type, categories } = action.payload;

         // Update the category order in the respective type
         state.value[type].categories = categories;
      },
      addBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         category: BudgetCategory
      }>) {
         const { type, category } = action.payload;

         // Add the new category to the respective type
         state.value[type].categories.push(category);
      },
      updateBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         updates: Partial<BudgetCategory> & { budget_category_id: string }
      }>) {
         const { type, updates } = action.payload;

         // Get the category index and category
         const categoryIndex = state.value[type].categories.findIndex(
            c => c.budget_category_id === updates.budget_category_id
         );
         if (categoryIndex === -1) return; // Ignore invalid category payloads

         const category = state.value[type].categories[categoryIndex];

         // Handle a swap of category types
         if (updates.type && updates.type !== category.type) {
            state.value[category.type].categories.splice(categoryIndex, 1);
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
         const categoryIndex = state.value[type].categories.findIndex(
            c => c.budget_category_id === budget_category_id
         );

         if (categoryIndex === -1) return; // Ignore invalid category payloads

         // Remove the category from the categories array
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
         const { month, year } = calculateNewPeriod(
            { month: state.value.period.month, year: state.value.period.year },
            direction
         );

         // Update the current period state
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

export const { setBudgets, updateBudget, addBudgetCategory, updateBudgetCategory, removeBudgetCategory, selectMonth, updateBudgetCategoryOrder } = budgetsSlice.actions;

export default budgetsSlice.reducer;