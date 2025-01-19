import { Alert, Stack } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import { useDispatch, useSelector } from "react-redux";

import { removeNotification, type Notification } from "@/redux/slices/notifications";
import type { RootState } from "@/redux/store";

export default function Notifications() {
   const dispatch = useDispatch();
   const notifications: Notification[] = useSelector((state: RootState) => state.notifications.value);

   return (
      notifications.length > 0 && (
         <Stack sx = { { position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999 } }>
            {
               notifications.slice().reverse().map((notification, index) => (
                  <Snackbar
                     anchorOrigin = { { vertical: "top", horizontal: "center" } }
                     key = { index }
                     open = { true }
                     sx = { { mt: index * 8 } }
                  >
                     <Alert
                        onClose = { () => dispatch(removeNotification(index)) }
                        severity = { notification.type }
                        sx = { { width: "100%", justifyContent: "center", alignItems: "center", fontWeight: "bold" } }
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