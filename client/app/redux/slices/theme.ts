import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type WritableDraft } from "immer";

/**
 * The theme state
 */
type ThemeState = { value: "light" | "dark" };

/**
 * Helper method to save the theme to local storage and the document body.
 *
 * @param {"light" | "dark"} theme - The theme to save
 */
const saveLocalTheme = (theme: "light" | "dark") => {
   localStorage.theme = theme;
   document.body.dataset.dark = theme === "dark" ? "true" : "false";
};

/**
 * The theme slice
 */
const themeSlice = createSlice({
   name: "theme",
   initialState: {
      value: "light" as "light" | "dark"
   } as ThemeState,
   reducers: {
      /**
       * Sets the theme in the Redux store.
       *
       * @param {WritableDraft<ThemeState>} state - The current state of the theme
       * @param {PayloadAction<"light" | "dark">} action - The dispatched action containing the payload
       */
      setTheme(state: WritableDraft<ThemeState>, action: PayloadAction<"light" | "dark">) {
         state.value = action.payload;
         saveLocalTheme(action.payload);
      },
      /**
       * Toggles the theme in the Redux store.
       *
       * @param {WritableDraft<ThemeState>} state - The current state of the theme
       */
      toggleTheme(state: WritableDraft<ThemeState>) {
         state.value = state.value === "light" ? "dark" : "light";
         saveLocalTheme(state.value);
      }
   }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;