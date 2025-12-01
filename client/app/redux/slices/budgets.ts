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
 * Current date for initializing budget period
 */
const today: Date = getCurrentDate();

/**
 * Redux state for budget management
 */
export type BudgetsState = { value: OrganizedBudgets & { period: BudgetPeriod }; }

/**
 * Budgets slice for managing income and expense categories
 */
const budgetsSlice = createSlice({
   name: "budgets",
   initialState: {
      value: {
         Income: { goals: [], goalIndex: 0, budget_category_id: "", categories: [], categoriesMap: {} },
         Expenses: { goals: [], goalIndex: 0, budget_category_id: "", categories: [], categoriesMap: {} },
         period: { month: today.getMonth() + 1, year: today.getFullYear() }
      }
   } as BudgetsState,
   reducers: {
      /**
       * Sets the budgets state
       *
       * @param {WritableDraft<BudgetsState>} state - Current budgets state
       * @param {PayloadAction<OrganizedBudgets>} action - Action containing budget data
       */
      setBudgets(state: WritableDraft<BudgetsState>, action: PayloadAction<OrganizedBudgets>) {
         state.value = { ...state.value, ...action.payload };
      },
      /**
       * Updates budget goal for the current period
       *
       * @param {WritableDraft<BudgetsState>} state - Current budgets state
       * @param {PayloadAction<{ type: BudgetType, budget_category_id: string, goal: number }>} action - Budget update data
       */
      updateBudget(state: WritableDraft<BudgetsState>, action: PayloadAction<{ type: BudgetType, budget_category_id: string, goal: number }>) {
         const { type, budget_category_id, goal } = action.payload;
         const { month, year } = state.value.period;
         const isMainCategory = state.value[type].budget_category_id === budget_category_id;

         // Get the respective category
         const category = isMainCategory ? state.value[type] : state.value[type].categories.find(
            c => c.budget_category_id === budget_category_id
         );

         // Ignore invalid category payloads
         if (!category) return;

         // Calculate the difference in time periods between the current period state and category goal period
         const currentGoal: BudgetGoal = category.goals[category.goalIndex];
         const difference: "before" | "equal" | "after" = compareBudgetPeriods(
            { month, year },
            { month: currentGoal.month, year: currentGoal.year }
         );

         if (difference !== "equal") {
            // Before implies an increment to the goal index as we are moving back in time
            const indexIncrement: number = difference === "before" ? 1 : 0;
            const indexAdjustment: number = category.goalIndex + indexIncrement;

            // Insert the new goal record for the current period
            category.goals.splice(indexAdjustment, 0, { year, month, goal });

            // Adjust the respective category goal index
            category.goalIndex = indexAdjustment;
            return;
         }

         // Update the existing goal record based on the current period
         category.goals[category.goalIndex].goal = goal;
      },
      /**
       * Reorders budget categories
       *
       * @param {WritableDraft<BudgetsState>} state - Current budgets state
       * @param {PayloadAction<{ type: BudgetType, categories: BudgetCategory[] }>} action - Action containing budget type and reordered categories array
       */
      updateBudgetCategoryOrder(state: WritableDraft<BudgetsState>, action: PayloadAction<{ type: BudgetType, categories: BudgetCategory[] }>) {
         const { type, categories } = action.payload;

         state.value[type].categories = categories;
      },

      /**
       * Adds a new budget category to the respective budget type
       *
       * @param {WritableDraft<BudgetsState>} state - Current budgets state
       * @param {PayloadAction<{ type: BudgetType, category: BudgetCategory }>} action - Action containing budget type and new category
       */
      addBudgetCategory(state: WritableDraft<BudgetsState>, action: PayloadAction<{ type: BudgetType, category: BudgetCategory }>) {
         const { type, category } = action.payload;

         state.value[type].categories.push(category);
      },
      /**
       * Updates a budget category
       *
       * @param {WritableDraft<BudgetsState>} state - Current budgets state
       * @param {PayloadAction<{ type: BudgetType, updates: Partial<BudgetCategory> & { budget_category_id: string } }>} action - Action containing budget type and category updates with required ID
       */
      updateBudgetCategory(state: WritableDraft<BudgetsState>, action: PayloadAction<{ type: BudgetType, updates: Partial<BudgetCategory> & { budget_category_id: string } }>) {
         const { type, updates } = action.payload;

         // Find the category index
         const categoryIndex: number = state.value[type].categories.findIndex(
            c => c.budget_category_id === updates.budget_category_id
         );

         // Ignore invalid category payloads
         if (categoryIndex === -1) return;

         // Fetch and update the category
         const category: BudgetCategory = state.value[type].categories[categoryIndex];
         const updatedCategory: BudgetCategory = { ...category, ...updates };

         // Handle a potential swap of category types
         if (updates.type && updates.type !== category.type) {
            state.value[category.type as BudgetType].categories.splice(categoryIndex, 1);
            state.value[updates.type as BudgetType].categories.push(updatedCategory);
         } else {
            state.value[type].categories[categoryIndex] = updatedCategory;
         }
      },
      /**
       * Removes a budget category
       *
       * @param {WritableDraft<BudgetsState>} state - Current budgets state
       * @param {PayloadAction<{ type: BudgetType, budget_category_id: string }>} action - Action containing budget type and category ID to remove
       */
      removeBudgetCategory(state: WritableDraft<BudgetsState>, action: PayloadAction<{ type: BudgetType, budget_category_id: string }>) {
         const { type, budget_category_id } = action.payload;

         // Find and remove the category
         const categoryIndex: number = state.value[type].categories.findIndex(
            c => c.budget_category_id === budget_category_id
         );

         // Ignore invalid category payloads
         if (categoryIndex === -1) return;

         state.value[type].categories.splice(categoryIndex, 1);
      },
      /**
       * Navigates between budget periods and updates goal indices
       *
       * @param {WritableDraft<BudgetsState>} state - Current budgets state
       * @param {PayloadAction<{ direction: "previous" | "next" }>} action - Action containing navigation direction
       */
      selectMonth(state: WritableDraft<BudgetsState>, action: PayloadAction<{ direction: "previous" | "next" }>) {
         const { direction } = action.payload;
         const today: Date = getCurrentDate();
         const isNextDirection: boolean = direction === "next";

         // Prevent future budget period selection
         if (isNextDirection
            && state.value.period.month === today.getMonth() + 1
            && state.value.period.year === today.getFullYear()) {
            return;
         }

         // Calculate the new period
         const period: BudgetPeriod = calculateNewBudgetPeriod(
            { month: state.value.period.month, year: state.value.period.year },
            direction
         );

         // Update the current period state
         state.value.period = period;

         // Helper function to potentially update goal indices based on the new period
         const updateGoalIndex = (category: WritableDraft<OrganizedBudget | BudgetCategory>) => {
            // Goals are sorted in descending order
            const currentIndex: number = category.goalIndex;
            const boundaryIndex: number = isNextDirection ? 0 : category.goals.length - 1;

            // Skip boundary goal indices
            if (currentIndex === boundaryIndex) return;

            // Fetch the potential new budget goal
            const { month, year } = period;
            const currentGoal: BudgetGoal = category.goals[currentIndex];

            // Adjust goal index based on direction and period comparison
            if (!isNextDirection) {
               // Handle going back in time
               const difference: "before" | "equal" | "after" = compareBudgetPeriods(
                  { month: currentGoal.month, year: currentGoal.year },
                  { month, year }
               );

               if (difference === "after") {
                  // Once the current goal is after the new period, increment the goal index
                  category.goalIndex++;
               }
            } else {
               // Handle going forward in time
               const goal: BudgetGoal = category.goals[currentIndex + (isNextDirection ? -1 : 1)];
               const difference: "before" | "equal" | "after" = compareBudgetPeriods(
                  { month: goal.month, year: goal.year },
                  { month, year }
               );

               if (difference === "equal") {
                  // Only update to closer goal periods on the exact period match
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