import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const authenticationSlice = createSlice({
   name: "authentication",
   initialState: {
      value: false
   },
   reducers: {
      authenticate(state, action: PayloadAction<boolean>) {
         state.value = action.payload;
         localStorage.setItem("authenticated", action.payload.toString());
      }
   }
});

export const { authenticate } = authenticationSlice.actions;
export default authenticationSlice.reducer;