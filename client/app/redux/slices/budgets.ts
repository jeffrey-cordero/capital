import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
   type BudgetCategory,
   type BudgetGoal,
   type BudgetPeriod,
   type OrganizedBudget,
   type OrganizedBudgets
} from "capital/budgets";
import { type WritableDraft } from "immer";

import { calculateNewBudgetPeriod, compareBudgetPeriods, getCurrentDate } from "@/lib/dates";

const today: Date = getCurrentDate();

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

         if (!category) return; // Ignore invalid category payloads

         // Calculate the difference in time periods between the state period and current category period
         const timePeriodDifference: -1 | 0 | 1 = compareBudgetPeriods({ month, year }, category.goals[category.goalIndex]);

         if (timePeriodDifference !== 0) {
            // Handle new budget goals, which are either closer or farther from the current category period
            const indexIncrement: number = Math.max(0, timePeriodDifference); // Closer periods (-1) remain at the same index
            const indexAdjustment: number = Math.max(0, category.goalIndex + indexIncrement);

            // Insert the new goal record
            category.goals.splice(indexAdjustment, 0, { year, month, goal });

            // Adjust the goal index
            category.goalIndex = indexAdjustment;
            return;
         }

         // Update the existing goal record, which matches the current period
         category.goals[category.goalIndex].goal = goal;
      },
      updateBudgetCategoryOrder(state, action: PayloadAction<{ type: "Income" | "Expenses", categories: BudgetCategory[] }>) {
         const { type, categories } = action.payload;
         state.value[type].categories = categories;
      },
      addBudgetCategory(state, action: PayloadAction<{ type: "Income" | "Expenses", category: BudgetCategory }>) {
         const { type, category } = action.payload;
         state.value[type].categories.push(category);
      },
      updateBudgetCategory(state, action: PayloadAction<{ type: "Income" | "Expenses", updates: Partial<BudgetCategory> & { budget_category_id: string } }>) {
         const { type, updates } = action.payload;

         // Find the category index
         const categoryIndex: number = state.value[type].categories.findIndex(
            c => c.budget_category_id === updates.budget_category_id
         );
         if (categoryIndex === -1) return; // Ignore invalid category payloads

         const category: BudgetCategory = state.value[type].categories[categoryIndex];

         // Handle a potential swap of category types
         if (updates.type && updates.type !== category.type) {
            state.value[category.type].categories.splice(categoryIndex, 1);
            state.value[updates.type].categories.push(category);
         }

         // Update the category with the new values
         Object.assign(category, { ...category, ...updates });
      },
      removeBudgetCategory(state, action: PayloadAction<{ type: "Income" | "Expenses", budget_category_id: string }>) {
         const { type, budget_category_id } = action.payload;

         // Find and remove the category
         const categoryIndex: number = state.value[type].categories.findIndex(
            c => c.budget_category_id === budget_category_id
         );

         if (categoryIndex === -1) return; // Ignore invalid category payloads

         state.value[type].categories.splice(categoryIndex, 1);
      },
      selectMonth(state, action: PayloadAction<{ direction: "previous" | "next" }>) {
         const { direction } = action.payload;
         const today: Date = getCurrentDate();
         const isNextDirection: boolean = direction === "next";

         // Don't allow selecting future months beyond current month
         if (isNextDirection
            && state.value.period.month === today.getUTCMonth() + 1
            && state.value.period.year === today.getUTCFullYear()) {
            return;
         }

         // Calculate the new period
         const newPeriod: BudgetPeriod = calculateNewBudgetPeriod(
            { month: state.value.period.month, year: state.value.period.year },
            direction
         );

         // Update the current period state
         state.value.period = newPeriod;

         // Helper function to update goal indices based on the new period
         const updateGoalIndex = (category: WritableDraft<OrganizedBudget | BudgetCategory>) => {
            const currentIndex: number = category.goalIndex;
            const boundaryIndex: number = isNextDirection ? 0 : category.goals.length - 1;

            // Skip processing if already at the boundary
            if (currentIndex === boundaryIndex) return;

            // Fetch the potential new budget goal
            const currentGoal: BudgetGoal = category.goals[currentIndex];
            const newGoal: BudgetGoal = category.goals[currentIndex + (isNextDirection ? -1 : 1)];

            // Adjust goal index based on direction and period comparison
            if (!isNextDirection) {
               const currentTimePeriodDifference: -1 | 0 | 1 = compareBudgetPeriods(
                  { month: currentGoal.month, year: currentGoal.year },
                  { month: newPeriod.month, year: newPeriod.year }
               );

               if (currentTimePeriodDifference === -1) {
                  // Increment to previous goal periods once current goal period exceeds the new period
                  category.goalIndex++;
               }
            } else {
               // Calculate the difference in time periods between the new goal and the new period
               const newTimePeriodDifference: -1 | 0 | 1 = compareBudgetPeriods(
                  { month: newGoal.month, year: newGoal.year },
                  { month: newPeriod.month, year: newPeriod.year }
               );

               if (newTimePeriodDifference === 0) {
                  // Only decrement to closer goal periods on the exact period match
                  category.goalIndex--;
               }
            }
         };

         // Update goal indices for all categories
         for (const type of ["Income", "Expenses"] as const) {
            updateGoalIndex(state.value[type]);

            for (const category of state.value[type].categories) {
               updateGoalIndex(category);
            }
         }
      }
   }
});

export const { setBudgets, updateBudget, addBudgetCategory, updateBudgetCategory, removeBudgetCategory, selectMonth, updateBudgetCategoryOrder } = budgetsSlice.actions;

export default budgetsSlice.reducer;