import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type WritableDraft } from "immer";

/**
 * Redux state for theme management
 */
type ThemeState = { value: "light" | "dark" };

/**
 * Saves theme preference to localStorage and updates document body
 *
 * @param {"light" | "dark"} theme - Selected theme
 */
const saveLocalTheme = (theme: "light" | "dark") => {
   localStorage.theme = theme;
   document.body.dataset.dark = theme === "dark" ? "true" : "false";
};

/**
 * Theme slice for managing UI appearance preferences
 */
const themeSlice = createSlice({
   name: "theme",
   initialState: {
      value: "light" as "light" | "dark"
   } as ThemeState,
   reducers: {
      /**
       * Sets the theme directly
       *
       * @param {WritableDraft<ThemeState>} state - Current theme state
       * @param {PayloadAction<"light" | "dark">} action - Action containing theme value
       */
      setTheme(state: WritableDraft<ThemeState>, action: PayloadAction<"light" | "dark">) {
         state.value = action.payload;
         saveLocalTheme(action.payload);
      },
      /**
       * Toggles between light and dark themes
       *
       * @param {WritableDraft<ThemeState>} state - Current theme state
       */
      toggleTheme(state: WritableDraft<ThemeState>) {
         state.value = state.value === "light" ? "dark" : "light";
         saveLocalTheme(state.value);
      }
   }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;