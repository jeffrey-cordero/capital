import { configureStore } from "@reduxjs/toolkit";

import accountsReducer from "@/redux/slices/accounts";
import authenticationReducer from "@/redux/slices/authentication";
import budgetsReducer from "@/redux/slices/budgets";
import marketReducer from "@/redux/slices/markets";
import notificationsReducer from "@/redux/slices/notifications";
import themeReducer from "@/redux/slices/theme";

/**
 * The Redux store for the application
 *
 * @description
 * - Configures the store with all reducers
 * - Sets up middleware for Redux
 */
const store = configureStore({
   reducer: {
      theme: themeReducer,
      authentication: authenticationReducer,
      notifications: notificationsReducer,
      markets: marketReducer,
      accounts: accountsReducer,
      budgets: budgetsReducer
   }
});

/**
 * Type definition for the entire Redux state
 *
 * @description
 * - Used for type-safe access to state in components and hooks
 * - Automatically inferred from the store's reducer configuration
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Type definition for the Redux dispatch function
 *
 * @description
 * - Used for type-safe dispatching of actions in components and hooks
 * - Enables proper typing for thunks and other middleware
 */
export type AppDispatch = typeof store.dispatch;

export default store;