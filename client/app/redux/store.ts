import { configureStore } from '@reduxjs/toolkit';
import authenticationReducer from '@/redux/slices/auth';

const store = configureStore({
  reducer: {
    auth: authenticationReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
