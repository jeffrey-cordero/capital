import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const authSlice = createSlice({
   name: "auth",
   initialState: {
      value: false
   },
   reducers: {
      login: (state) => {
         state.value = true;
      },
      logout: (state) => {
         state.value = false;
      },
      authenticate(state, action: PayloadAction<boolean>) {
         state.value = action.payload;
      }
   }
});

export const { login, logout, authenticate } = authSlice.actions;
export default authSlice.reducer;