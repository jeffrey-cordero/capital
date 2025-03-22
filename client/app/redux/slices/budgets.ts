import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
   type BudgetCategory,
   type BudgetGoals,
   type OrganizedBudget,
   type OrganizedBudgets,
   type Period
} from "capital/budgets";
import { type WritableDraft } from "immer";

import { getCurrentDate } from "@/lib/dates";

const calculateNewPeriod = ({ month, year }: Period, direction: "previous" | "next"): Period => {
   if (direction === "previous") {
      return { month: month === 1 ? 12 : month - 1, year: month === 1 ? year - 1 : year };
   } else {
      return { month: month === 12 ? 1 : month + 1, year: month === 12 ? year + 1 : year };
   }
};

export const comparePeriods = (p1: Period, p2: Period): -1 | 0 | 1 => {
   // Returns 0 if the periods are the same, 1 if p1 is before p2, -1 if p1 is after p2
   if (p1.year === p2.year && p1.month === p2.month) {
      return 0;
   } else if (p1.year < p2.year || (p1.year === p2.year && p1.month < p2.month)) {
      return 1;
   } else {
      return -1;
   }
};

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

         // Calculate the difference in time periods between the state period and current category period (closest to state period)
         const timePeriodDifference: -1 | 0 | 1 = comparePeriods({ month, year }, category.goals[category.goalIndex]);

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

         // Update the category order in the respective type
         state.value[type].categories = categories;
      },
      addBudgetCategory(state, action: PayloadAction<{ type: "Income" | "Expenses", category: BudgetCategory }>) {
         const { type, category } = action.payload;

         // Add the new category to the respective type
         state.value[type].categories.push(category);
      },
      updateBudgetCategory(state, action: PayloadAction<{ type: "Income" | "Expenses", updates: Partial<BudgetCategory> & { budget_category_id: string } }>) {
         const { type, updates } = action.payload;

         // Get the category index and category, where main categories may not be updated
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

         // Remove the category from the categories array
         const categoryIndex: number = state.value[type].categories.findIndex(
            c => c.budget_category_id === budget_category_id
         );

         if (categoryIndex === -1) return; // Ignore invalid category payloads

         // Remove the category from the categories array
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
         const newPeriod: Period = calculateNewPeriod(
            { month: state.value.period.month, year: state.value.period.year },
            direction
         );

         // Update the current period state
         state.value.period = newPeriod;

         const updateGoalIndex = (category: WritableDraft<OrganizedBudget | BudgetCategory>) => {
            const currentIndex: number = category.goalIndex;
            const boundaryIndex: number = isNextDirection ? 0 : category.goals.length - 1;

            // Skip processing if already at the boundary
            if (currentIndex === boundaryIndex) return;

            // Fetch the potential new budget goal
            const currentGoal:  BudgetGoals = category.goals[currentIndex];
            const newGoal: BudgetGoals = category.goals[currentIndex + (isNextDirection ? -1 : 1)];

            // Calculate the difference in time periods between the current goal and the new period
            const currentTimePeriodDifference: -1 | 0 | 1 = comparePeriods(
               { month: currentGoal.month, year: currentGoal.year },
               { month: newPeriod.month, year: newPeriod.year }
            );

            if (!isNextDirection && currentTimePeriodDifference === -1) {
               // Increment to previous goal periods once current goal period exceeds the new period
               category.goalIndex++;
            } else if (!isNextDirection) return; // Skip further processing for the previous direction request

            // Calculate the difference in time periods between the new goal and the new period
            const newTimePeriodDifference: -1 | 0 | 1 = comparePeriods(
               { month: newGoal.month, year: newGoal.year },
               { month: newPeriod.month, year: newPeriod.year }
            );

            if (isNextDirection && newTimePeriodDifference === 0) {
               // Only decrement to closer goal periods on the exact period match
               category.goalIndex--;
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