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
         localStorage.setItem("authenticated", "false");
      },
      authenticate(state, action: PayloadAction<boolean>) {
         state.value = action.payload;
         localStorage.setItem("authenticated", action.payload.toString());
      }
   }
});

export const { login, logout, authenticate } = authenticationSlice.actions;
export default authenticationSlice.reducer;