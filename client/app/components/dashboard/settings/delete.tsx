import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { sendApiRequest } from "@/lib/api";
import { addNotification } from "@/redux/slices/notifications";

/**
 * DeleteAccount component for deleting user account
 *
 * @returns {React.ReactNode} The DeleteAccount component
 */
export default function DeleteAccount(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      try {
         const response = await sendApiRequest<number>(
            "users", "DELETE", undefined, dispatch, navigate
         );

         if (response === 204) {
            dispatch(addNotification({
               message: "Account deleted successfully",
               type: "success"
            }));

            // Redirect to the login page
            navigate("/login");
         }
      } catch (error) {
         console.error("Failed to delete account:", error);
      }
   }, [dispatch, navigate]);

   return (
      <Confirmation
         message = "Are you sure you want to delete your account? This action cannot be undone."
         onConfirmation = { onSubmit }
         title = "Delete Account"
         type = "button"
      />
   );
}