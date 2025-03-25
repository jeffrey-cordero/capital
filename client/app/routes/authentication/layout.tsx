import type { Dispatch } from "@reduxjs/toolkit";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { type NavigateFunction, Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { sendApiRequest } from "@/lib/api";
import { authenticate } from "@/redux/slices/authentication";

/**
 * Fetches the authentication status within the landing pages
 *
 * @param {Dispatch<any>} dispatch - The dispatch function to dispatch actions to the Redux store
 * @param {NavigateFunction} navigate - The navigate function for potential authentication-based redirection
 * @returns {Promise<boolean>} The authentication status
 * @description
 * - Fetches the authentication status within the landing pages
 * - Sets the global authentication state for routing purposes
 */
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
      dispatch(authenticate(Boolean(status.authenticated)));

      return null; // null to continue the loading process until auto-redirect
   }

   return false; // false to remain on the current page
};

/**
 * The layout component for the authentication pages
 *
 * @returns {React.ReactNode} The layout component
 * @description
 * - Fetches the authentication status within the initial landing pages
 * - Displays the loading component while fetching or error has occurred
 * - Displays the outlet (react-router) if the authentication status is retrieved
 */
export default function Layout(): React.ReactNode {
   // Fetch the authentication status within the initial landing pages
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isError, isLoading } = useQuery({
      queryKey: ["authentication"],
      queryFn: () => fetchAuthentication(dispatch, navigate),
      staleTime: 5 * 60 * 1000
   });

   if (isLoading || isError || data === null) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}