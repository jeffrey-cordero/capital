import { Alert, Stack } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { type Notification, removeNotification } from "@/redux/slices/notifications";
import type { RootState } from "@/redux/store";

/**
 * Global notification display component, which renders a stack of notification
 * alerts at the top of the screen
 *
 * @returns {React.ReactNode} Stack of notification alerts
 */
export default function Notifications(): React.ReactNode {
   const dispatch = useDispatch();
   const notifications: Notification[] = useSelector((state: RootState) => state.notifications.value);

   // Remove notifications by their index
   const remove = useCallback((index: number) => {
      dispatch(removeNotification(index));
   }, [dispatch]);

   return (
      notifications.length > 0 && (
         <Stack sx = { { position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999 } }>
            {
               notifications.slice().reverse().map((notification, index) => (
                  <Snackbar
                     anchorOrigin = { { vertical: "top", horizontal: "center" } }
                     key = { index }
                     open = { true }
                     sx = { { mt: index * 9 } }
                  >
                     <Alert
                        data-testid = "notification"
                        data-type = { notification.type }
                        onClose = { () => remove(index) }
                        severity = { notification.type }
                        sx = { { width: "100%", justifyContent: "center", alignItems: "center", fontWeight: "bold", color: "white" } }
                        variant = "filled"
                     >
                        { notification.message }
                     </Alert>
                  </Snackbar>
               ))
            }
         </Stack>
      )
   );
};