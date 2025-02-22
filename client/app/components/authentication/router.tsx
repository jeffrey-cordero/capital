import { CssBaseline, ThemeProvider } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";

import Loading from "@/components/global/loading";
import Notifications from "@/components/global/notifications";
import { SideBar } from "@/components/global/sidebar";
import { getAuthentication } from "@/lib/authentication";
import { authenticate } from "@/redux/slices/authentication";
import { setTheme } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";
import { theme } from "@/styles/mui/theme";

export default function Router({ secure }: { secure: boolean }) {
   // Authentication-based routing
   const { data, isLoading, error, isError } = useQuery({
      queryKey: ["authentication"],
      queryFn: getAuthentication,
      staleTime: 1 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });
   const mode: "light" | "dark" = useSelector((state: RootState) => state.theme.value);
   const authenticated = useSelector((state: RootState) => state.authentication.value);
   const redirecting: boolean = (authenticated && !secure) || (!authenticated && secure);
   const navigate = useNavigate();
   const dispatch = useDispatch();

   useEffect(() => {
      // Check for authentication state in local storage prior to server confirmation
      dispatch(authenticate(localStorage.getItem("authenticated") === "true"));

      // Set theme state based on body data-dark attribute calculated client-side
      dispatch(setTheme(document.body.dataset.dark === "true" ? "dark" : "light"));
   }, [dispatch]);

   useEffect(() => {
      // Set authentication state based on server response
      if (isLoading) return;

      if (data !== true) {
         // Not authenticated
         dispatch(authenticate(false));
      } else {
         // Authenticated
         dispatch(authenticate(true));
      }
   }, [dispatch, data, error, isError, isLoading]);

   useEffect(() => {
      if (!isLoading && redirecting) {
         navigate(authenticated ? "/home" : "/login");
      }
   }, [authenticated, secure, navigate, isLoading, redirecting]);

   if (isLoading || redirecting) {
      return <Loading />;
   } else {
      return (
         <ThemeProvider theme = { theme(mode) }>
            <CssBaseline />
            <SideBar />
            <Notifications />
            <Outlet />
         </ThemeProvider>
      );
   }
}