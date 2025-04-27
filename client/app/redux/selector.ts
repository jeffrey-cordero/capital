import { createSelector } from "@reduxjs/toolkit";

import type { RootState } from "@/redux/store";

/**
 * Selector for exporting user data within the Redux store into a single object
 */
export const selectExportData = createSelector(
   (state: RootState) => state,
   (state) => ({
      settings: state.settings.value,
      accounts: state.accounts.value,
      budgets: state.budgets.value,
      transactions: state.transactions.value
   })
);