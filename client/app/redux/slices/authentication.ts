import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const authenticationSlice = createSlice({
   name: "authentication",
   initialState: {
      value: undefined as undefined | boolean
   },
   reducers: {
      authenticate(state, action: PayloadAction<boolean>) {
         state.value = action.payload;
      }
   }
});

export const { authenticate } = authenticationSlice.actions;
export default authenticationSlice.reducer;