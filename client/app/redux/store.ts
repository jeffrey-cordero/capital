import { configureStore } from '@reduxjs/toolkit';
import authenticationReducer from './slices/authentication';
import themeReducer from './slices/theme';

const store = configureStore({
  reducer: {
    authentication: authenticationReducer,
    theme: themeReducer
  },
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
