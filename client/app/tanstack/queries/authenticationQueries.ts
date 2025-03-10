import type { Dispatch } from "@reduxjs/toolkit";
import type { NavigateFunction } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { authenticate } from "@/redux/slices/authentication";

export async function fetchAuthentication(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<boolean | null> {
   // Fetch authentication status within the landing pages
   const status = await sendApiRequest<{ authenticated: boolean }>(
      "authentication", "GET", null, dispatch, navigate
   );

   if (typeof status === "object" && status !== null) {
      // Set the global authentication state for routing purposes
      dispatch(authenticate(status.authenticated));
   }

   return typeof status === "object" && status?.authenticated === true ? null : false;
};

export async function clearAuthentication(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<void> {
   const logout = await sendApiRequest<{ success: boolean }>(
      "authentication/logout", "POST", null, dispatch, navigate
   );

   if (typeof logout === "object" && logout?.success) {
      // Navigate to the login page to reset the global state
      window.location.pathname = "/login";
   }
};