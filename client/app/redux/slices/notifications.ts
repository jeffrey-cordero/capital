import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
   type: "success" | "error";
   message: string;
}

const notificationsSlice = createSlice({
   name: "notifications",
   initialState: {
      value: [] as Notification[]
   },
   reducers: {
      addNotification: (state, action: PayloadAction<Notification>) => {
         state.value.push(action.payload);
      },
      removeNotification: (state, action: PayloadAction<number>) => {
         state.value = state.value.filter((_, index) => index !== action.payload);
      }
   }
});

export const { addNotification, removeNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;