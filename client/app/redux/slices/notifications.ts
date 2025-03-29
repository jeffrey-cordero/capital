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
 * The state of the notifications slice
 */
type NotificationState = { value: Notification[] };

/**
 * The notifications slice
 */
const notificationsSlice = createSlice({
   name: "notifications",
   initialState: {
      value: []
   } as NotificationState,
   reducers: {
      /**
       * Adds a notification to the notifications slice.
       *
       * @param {WritableDraft<NotificationState>} state - The current state of the notifications slice
       * @param {PayloadAction<Notification>} action - The dispatched action containing the payload
       */
      addNotification: (state: WritableDraft<NotificationState>, action: PayloadAction<Notification>) => {
         state.value.push(action.payload);
      },
      /**
       * Removes a notification from the notifications slice.
       *
       * @param {WritableDraft<NotificationState>} state - The current state of the notifications slice
       * @param {PayloadAction<number>} action - The dispatched action containing the payload
       */
      removeNotification: (state: WritableDraft<NotificationState>, action: PayloadAction<number>) => {
         state.value = state.value.filter((_, index) => index !== action.payload);
      }
   }
});

export const { addNotification, removeNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;