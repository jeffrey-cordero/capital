import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type BudgetCategory, type OrganizedBudgets } from "capital/budgets";

const budgetsSlice = createSlice({
   name: "budgets",
   initialState: {
      value: {
         Income: { goals: [], budget_category_id: "", categories: [] },
         Expenses: { goals: [], budget_category_id: "", categories: [] }
      } as OrganizedBudgets
   },
   reducers: {
      setBudgets(state, action: PayloadAction<OrganizedBudgets>) {
         state.value = action.payload;
      },
      updateBudgetGoal(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         budget_category_id: string,
         year: number,
         month: number,
         goal: number
      }>) {
         const { type, budget_category_id, year, month, goal } = action.payload;

         const goalRecord = state.value[type].categories.find(
            c => c.budget_category_id === budget_category_id
         )?.goals?.find(g => g.year === year && g.month === month);

         if (goalRecord) {
            goalRecord.goal = goal;
         }
      },
      addBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         category: {
            budget_category_id: string,
            name: string,
            type: "Income" | "Expenses",
            category_order: number,
            goals: Array<{ year: number, month: number, goal: number }>
         }
      }>) {
         const { type, category } = action.payload;

         state.value[type].categories.push(category);
      },
      updateBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         updates: Partial<BudgetCategory>
      }>) {
         const { type, updates } = action.payload;

         const categoryRecord = state.value[type].categories.find(
            c => c.budget_category_id === updates.budget_category_id
         )

         if (categoryRecord) {
            Object.assign(categoryRecord, { ...categoryRecord, ...updates });
         }
      },

      // Remove a budget category
      removeBudgetCategory(state, action: PayloadAction<{
         type: "Income" | "Expenses",
         categoryId: string
      }>) {
         const { type, categoryId } = action.payload;

         state.value[type].categories = state.value[type].categories.filter(
            c => c.budget_category_id !== categoryId
         );
      }
   }
});

export const { setBudgets, updateBudgetGoal, addBudgetCategory, updateBudgetCategory, removeBudgetCategory } = budgetsSlice.actions;

export default budgetsSlice.reducer;