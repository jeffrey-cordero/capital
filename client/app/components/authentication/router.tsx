import { CssBaseline, ThemeProvider } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Loading from "@/components/global/loading";
import Notifications from "@/components/global/notifications";
import { SideBar } from "@/components/global/sidebar";
import { fetchAuthentication } from "@/lib/authentication";
import { authenticate } from "@/redux/slices/authentication";
import { addNotification } from "@/redux/slices/notifications";
import { setTheme } from "@/redux/slices/theme";
import type { RootState } from "@/redux/store";
import { theme } from "@/styles/mui/theme";

export default function Router({ home }: { home: boolean }) {
   // Authentication-based routing
   const { data, isLoading, error, isError } = useQuery({
      queryKey: ["authentication"],
      queryFn: fetchAuthentication,
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });

   const mode: "light" | "dark" = useSelector((state: RootState) => state.theme.value);
   const authenticated: boolean = useSelector((state: RootState) => state.auth.value);
   const redirect: boolean = home && !authenticated || !home && authenticated;
   const navigate = useNavigate();
   const dispatch = useDispatch();

   useEffect(() => {
      // Set authentication state
      if (isLoading) return;

      if (isError) {
         // Internal server error
         console.error(error);

         dispatch(
            addNotification({
               type: "error",
               message: "Internal Server Error"
            })
         );

         dispatch(authenticate(false));
      } else if (!data) {
         // Unauthenticated
         dispatch(authenticate(false));
      } else {
         // Authenticated
         dispatch(authenticate(true));
      }

      // Set theme state based on body data-dark attribute calculated client-side
      dispatch(setTheme(document.body.dataset.dark === "true" ? "dark" : "light"));
   }, [dispatch, data, error, isError, isLoading]);

   useEffect(() => {
      if (redirect) {
         navigate(home ? "/login": "/home" );
      }
   }, [home, navigate, redirect]);

   if (isLoading || redirect) {
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