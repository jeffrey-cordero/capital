import { configureStore } from "@reduxjs/toolkit";

import authenticationReducer from "@/redux/slices/auth";
import notificationsReducer from "@/redux/slices/notifications";

const store = configureStore({
   reducer: {
      auth: authenticationReducer,
      notifications: notificationsReducer
   }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;