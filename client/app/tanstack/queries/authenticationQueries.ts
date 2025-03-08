import type { Dispatch } from "@reduxjs/toolkit";
import type { NavigateFunction } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { authenticate } from "@/redux/slices/authentication";

export async function fetchAuthentication(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<boolean | null> {
   // Fetch authentication status within the landing pages
   const status: { authenticated: boolean } = await sendApiRequest(
      "authentication", "GET", null, dispatch, navigate
   );

   if (status !== null) {
      // Set the global authentication state for routing purposes
      dispatch(authenticate(status.authenticated));
   }

   return status.authenticated === true ? null : false;
};

export async function clearAuthentication(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<void> {
   const logout: { success: boolean } = await sendApiRequest(
      "authentication/logout", "POST", null, dispatch, navigate
   );

   if (logout?.success) {
      // Navigate to the login page to reset the global state
      window.location.pathname = "/login";
   }
};