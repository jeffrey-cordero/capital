import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
   type BudgetCategory,
   type BudgetGoal,
   type BudgetPeriod,
   type BudgetType,
   type OrganizedBudget,
   type OrganizedBudgets
} from "capital/budgets";
import { type WritableDraft } from "immer";

import { calculateNewBudgetPeriod, compareBudgetPeriods, getCurrentDate } from "@/lib/dates";

/**
 * The current date
 */
const today: Date = getCurrentDate();

/**
 * The state of the budgets slice
 */
type BudgetState = { value: OrganizedBudgets & { period: BudgetPeriod }; }

/**
 * The budgets slice
 */
const budgetsSlice = createSlice({
   name: "budgets",
   initialState: {
      value: {
         Income: { goals: [], goalIndex: 0, budget_category_id: "", categories: [], categoriesMap: {} },
         Expenses: { goals: [], goalIndex: 0, budget_category_id: "", categories: [], categoriesMap: {} },
         period: { month: today.getUTCMonth() + 1, year: today.getUTCFullYear() }
      }
   } as BudgetState,
   reducers: {
      /**
       * Sets the budgets state in the Redux store.
       *
       * @param {WritableDraft<BudgetState>} state - The current state of the budgets
       * @param {PayloadAction<OrganizedBudgets>} action - The dispatched action containing the payload
       */
      setBudgets(state: WritableDraft<BudgetState>, action: PayloadAction<OrganizedBudgets>) {
         state.value = { ...state.value, ...action.payload };
      },
      /**
       * Updates a category budget in the Redux store for a specific budget type.
       *
       * @param {WritableDraft<BudgetState>} state - The current state of the budgets
       * @param {PayloadAction<{ type: BudgetType, budget_category_id: string, goal: number }>} action - The dispatched action containing the payload
       */
      updateBudget(state: WritableDraft<BudgetState>, action: PayloadAction<{ type: BudgetType, budget_category_id: string, goal: number }>) {
         const { type, budget_category_id, goal } = action.payload;
         const { month, year } = state.value.period;
         const isMainCategory = state.value[type].budget_category_id === budget_category_id;

         // Get the respective category
         const category = isMainCategory ? state.value[type] : state.value[type].categories.find(
            c => c.budget_category_id === budget_category_id
         );

         if (!category) return; // Ignore invalid category payloads

         // Calculate the difference in time periods between the current state period and current category goal period
         const currentGoal: BudgetGoal = category.goals[category.goalIndex];
         const timePeriodDifference: -1 | 0 | 1 = compareBudgetPeriods(
            { month, year },
            { month: currentGoal.month, year: currentGoal.year }
         );

         if (timePeriodDifference !== 0) {
            // Handle new budget periods, which are either closer or farther from the current category goal period
            const indexIncrement: number = Math.max(0, timePeriodDifference); // Closer periods (difference of -1) remain at the same index (no increment)
            const indexAdjustment: number = Math.max(0, category.goalIndex + indexIncrement);

            // Insert the new goal record for the current period
            category.goals.splice(indexAdjustment, 0, { year, month, goal });

            // Adjust the respective category goal index
            category.goalIndex = indexAdjustment;
            return;
         }

         // Update the existing goal record within the current period
         category.goals[category.goalIndex].goal = goal;
      },
      /**
       * Updates the order of categories in the Redux store for a specific budget type.
       *
       * @param {WritableDraft<BudgetState>} state - The current state of the budgets
       * @param {PayloadAction<{ type: BudgetType, categories: BudgetCategory[] }>} action - The dispatched action containing the payload
       */
      updateBudgetCategoryOrder(state: WritableDraft<BudgetState>, action: PayloadAction<{ type: BudgetType, categories: BudgetCategory[] }>) {
         const { type, categories } = action.payload;
         state.value[type].categories = categories;
      },

      /**
       * Adds a category to the Redux store for a specific budget type.
       *
       * @param {WritableDraft<BudgetState>} state - The current state of the budgets
       * @param {PayloadAction<{ type: BudgetType, category: BudgetCategory }>} action - The dispatched action containing the payload
       */
      addBudgetCategory(state: WritableDraft<BudgetState>, action: PayloadAction<{ type: BudgetType, category: BudgetCategory }>) {
         const { type, category } = action.payload;
         state.value[type].categories.push(category);
      },
      /**
       * Updates a category in the Redux store for a specific budget type.
       *
       * @param {WritableDraft<BudgetState>} state - The current state of the budgets
       * @param {PayloadAction<{ type: BudgetType, updates: Partial<BudgetCategory> & { budget_category_id: string } }>} action - The dispatched action containing the payload
       */
      updateBudgetCategory(state: WritableDraft<BudgetState>, action: PayloadAction<{ type: BudgetType, updates: Partial<BudgetCategory> & { budget_category_id: string } }>) {
         const { type, updates } = action.payload;

         // Find the category index
         const categoryIndex: number = state.value[type].categories.findIndex(
            c => c.budget_category_id === updates.budget_category_id
         );
         if (categoryIndex === -1) return; // Ignore invalid category payloads

         const category: BudgetCategory = state.value[type].categories[categoryIndex];
         const updatedCategory: BudgetCategory = { ...category, ...updates };

         // Handle a potential swap of category types
         if (updates.type && updates.type !== category.type) {
            state.value[category.type].categories.splice(categoryIndex, 1);
            state.value[updates.type].categories.push(updatedCategory);
         } else {
            state.value[type].categories[categoryIndex] = updatedCategory;
         }
      },
      /**
       * Removes a category from the Redux store for a specific budget type.
       *
       * @param {WritableDraft<BudgetState>} state - The current state of the budgets
       * @param {PayloadAction<{ type: BudgetType, budget_category_id: string }>} action - The dispatched action containing the payload
       */
      removeBudgetCategory(state: WritableDraft<BudgetState>, action: PayloadAction<{ type: BudgetType, budget_category_id: string }>) {
         const { type, budget_category_id } = action.payload;

         // Find and remove the category
         const categoryIndex: number = state.value[type].categories.findIndex(
            c => c.budget_category_id === budget_category_id
         );

         if (categoryIndex === -1) return; // Ignore invalid category payloads

         state.value[type].categories.splice(categoryIndex, 1);
      },
      /**
       * Selects a new budget period in the Redux store, updating potential category goal indices.
       *
       * @param {WritableDraft<BudgetState>} state - The current state of the budgets
       * @param {PayloadAction<{ direction: "previous" | "next" }>} action - The dispatched action containing the payload
       */
      selectMonth(state: WritableDraft<BudgetState>, action: PayloadAction<{ direction: "previous" | "next" }>) {
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