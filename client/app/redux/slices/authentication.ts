import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const authenticationSlice = createSlice({
   name: "authentication",
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

export const { login, logout, authenticate } = authenticationSlice.actions;
export default authenticationSlice.reducer;