import type { Dispatch } from "@reduxjs/toolkit";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { type NavigateFunction, Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { sendApiRequest } from "@/lib/api";
import { authenticate } from "@/redux/slices/authentication";

/**
 * Fetches authentication status and handles redirection logic
 *
 * @param {Dispatch<any>} dispatch - Redux dispatch function
 * @param {NavigateFunction} navigate - Router navigation function
 * @returns {Promise<boolean | null>} Authentication status or null for error handling
 */
export async function fetchAuthentication(dispatch: Dispatch<any>, navigate: NavigateFunction): Promise<boolean| null> {
   const status = await sendApiRequest<{ authenticated: boolean }>(
      "authentication", "GET", null, dispatch, navigate
   );

   if (typeof status === "object" && status !== null) {
      const authenticated: boolean = Boolean(status.authenticated);
      dispatch(authenticate(authenticated));

      return authenticated;
   }

   return null;
};

/**
 * Layout wrapper for authentication-related pages
 *
 * @returns {React.ReactNode} The authentication layout component
 */
export default function Layout(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isError, isLoading } = useQuery({
      queryKey: ["authentication"],
      queryFn: () => fetchAuthentication(dispatch, navigate),
      staleTime: 5 * 60 * 1000
   });

   if (isLoading || isError || data === true) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}