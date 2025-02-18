import { configureStore } from "@reduxjs/toolkit";

import authenticationReducer from "@/redux/slices/authentication";
import notificationsReducer from "@/redux/slices/notifications";
import themeReducer from "@/redux/slices/theme";

const store = configureStore({
   reducer: {
      theme: themeReducer,
      authentication: authenticationReducer,
      notifications: notificationsReducer
   }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;