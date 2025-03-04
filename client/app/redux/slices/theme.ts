import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const saveLocalTheme = (theme: "light" | "dark") => {
   localStorage.theme = theme;
   document.body.dataset.dark = theme === "dark" ? "true" : "false";
};

const themeSlice = createSlice({
   name: "theme",
   initialState: {
      value: "light" as "light" | "dark"
   },
   reducers: {
      setTheme(state, action: PayloadAction<"light" | "dark">) {
         state.value = action.payload;
         saveLocalTheme(action.payload);
      },
      toggleTheme: (state) => {
         state.value = state.value === "light" ? "dark" : "light";
         saveLocalTheme(state.value);
      }
   }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;