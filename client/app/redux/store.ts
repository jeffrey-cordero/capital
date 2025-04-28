import { configureStore } from "@reduxjs/toolkit";

import accountsReducer from "@/redux/slices/accounts";
import authenticationReducer from "@/redux/slices/authentication";
import budgetsReducer from "@/redux/slices/budgets";
import economyReducer from "@/redux/slices/economy";
import notificationsReducer from "@/redux/slices/notifications";
import settingsReducer from "@/redux/slices/settings";
import themeReducer from "@/redux/slices/theme";
import transactionsReducer from "@/redux/slices/transactions";

/**
 * Redux store configuration with all application reducers
 */
const store = configureStore({
   reducer: {
      theme: themeReducer,
      authentication: authenticationReducer,
      notifications: notificationsReducer,
      economy: economyReducer,
      accounts: accountsReducer,
      budgets: budgetsReducer,
      transactions: transactionsReducer,
      settings: settingsReducer
   }
});

/**
 * Type for accessing complete application state
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Type for dispatching actions to the store
 */
export type AppDispatch = typeof store.dispatch;

export default store;