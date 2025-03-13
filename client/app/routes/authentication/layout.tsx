import type { Dispatch } from "@reduxjs/toolkit";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { type NavigateFunction, Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
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

export default function Layout() {
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