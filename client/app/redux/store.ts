import { configureStore } from "@reduxjs/toolkit";

import accountsReducer from "@/redux/slices/accounts";
import authenticationReducer from "@/redux/slices/authentication";
import economyReducer from "@/redux/slices/economy";
import notificationsReducer from "@/redux/slices/notifications";
import themeReducer from "@/redux/slices/theme";

const store = configureStore({
   reducer: {
      theme: themeReducer,
      authentication: authenticationReducer,
      notifications: notificationsReducer,
      economy: economyReducer,
      accounts: accountsReducer
   }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;