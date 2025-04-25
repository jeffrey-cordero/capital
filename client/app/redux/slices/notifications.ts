import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type WritableDraft } from "immer";

/**
 * The notification type
 */
export interface Notification {
   type: "success" | "error";
   message: string;
}

/**
 * Redux state for notifications management
 */
type NotificationState = { value: Notification[] };

/**
 * Notifications slice for managing global notifications
 */
const notificationsSlice = createSlice({
   name: "notifications",
   initialState: {
      value: []
   } as NotificationState,
   reducers: {
      /**
       * Adds a notification message
       *
       * @param {WritableDraft<NotificationState>} state - Current notifications state
       * @param {PayloadAction<Notification>} action - Action containing the notification to add
       */
      addNotification: (state: WritableDraft<NotificationState>, action: PayloadAction<Notification>) => {
         state.value.push(action.payload);
      },
      /**
       * Removes a notification by index
       *
       * @param {WritableDraft<NotificationState>} state - Current notifications state
       * @param {PayloadAction<number>} action - Action containing the index to remove
       */
      removeNotification: (state: WritableDraft<NotificationState>, action: PayloadAction<number>) => {
         state.value = state.value.filter((_, index) => index !== action.payload);
      }
   }
});

export const { addNotification, removeNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;