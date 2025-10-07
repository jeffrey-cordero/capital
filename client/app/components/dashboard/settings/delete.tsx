import { faUserXmark } from "@fortawesome/free-solid-svg-icons";
import { Box } from "@mui/material";
import { HTTP_STATUS } from "capital/server";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";

/**
 * Handles permanent account deletion with confirmation
 *
 * @returns {React.ReactNode} Delete account button with warning confirmation
 */
export default function DeleteAccount(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      try {
         // Submit the API request for account deletion
         const response = await sendApiRequest<number>(
            "users", "DELETE", undefined, dispatch, navigate
         );

         if (response === HTTP_STATUS.NO_CONTENT) {
            // Direct user to the landing page on successful deletion
            window.location.href = "/";
         }
      } catch (error) {
         console.error("Failed to delete account:", error);
      }
   }, [dispatch, navigate]);

   return (
      <Box sx = { { width: "100%" } }>
         <Confirmation
            message = "Are you sure you want to delete your account? This action cannot be undone."
            onConfirmation = { onSubmit }
            startIcon = { faUserXmark }
            title = "Delete Account"
            type = "button"
         />
      </Box>
   );
}