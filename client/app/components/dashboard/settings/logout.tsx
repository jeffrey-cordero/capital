import { faPersonWalkingLuggage } from "@fortawesome/free-solid-svg-icons";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Confirmation from "@/components/global/confirmation";
import { clearAuthentication } from "@/components/global/sidebar";

/**
 * Logout component for logging out of the application within the settings page
 *
 * @returns {React.ReactNode} The Logout component
 */
export default function Logout(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();

   const onSubmit = useCallback(async() => {
      await clearAuthentication(dispatch, navigate);
   }, [dispatch, navigate]);

   return (
      <Confirmation
         color = "warning"
         message = "Are you sure you want to logout?"
         onConfirmation = { onSubmit }
         startIcon = { faPersonWalkingLuggage }
         title = "Logout"
         type = "button"
      />
   );
}