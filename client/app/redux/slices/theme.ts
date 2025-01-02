import { createSlice } from "@reduxjs/toolkit";

const themeSlice = createSlice({
  name: "theme",
  initialState: {
   theme: "light",
  },
  reducers: {
    toggleTheme: (state) => {
      // Toggle the theme between dark and light
      state.theme = state.theme === "light" ? "dark" : "light";

      window.localStorage.setItem("theme", state.theme);
    },
  },
});

export const { toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
