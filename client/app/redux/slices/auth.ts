import { createSlice } from "@reduxjs/toolkit";

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
      authenticate(state, action) {
         const value: boolean = action.payload;
         state.value = value;
      }
   }
});

export const { login, logout, authenticate } = authSlice.actions;
export default authSlice.reducer;