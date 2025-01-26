import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const themeSlice = createSlice({
   name: "theme",
   initialState: {
      value: "light" as "light" | "dark"
   },
   reducers: {
      toggle: (state) => {
         state.value = state.value === "light" ? "dark" : "light";
      }
   }
});

export const { toggle } = themeSlice.actions;
export default themeSlice.reducer;