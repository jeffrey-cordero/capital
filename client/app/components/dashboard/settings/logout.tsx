import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { Box } from "@mui/material";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";

/**
 * Provides user logout functionality
 *
 * @returns {React.ReactNode} Logout button with confirmation dialog
 */
export default function Logout(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      await sendApiRequest<{ success: boolean }>(
         "authentication/logout", "POST", null, dispatch, navigate
      );
   }, [dispatch, navigate]);

   return (
      <Box sx = { { width: "100%" } }>
         <Confirmation
            dataTestId = "settings-logout"
            color = "warning"
            message = "Are you sure you want to logout?"
            onConfirmation = { onSubmit }
            startIcon = { faRightFromBracket }
            title = "Logout"
            type = "button"
         />
      </Box>
   );
}