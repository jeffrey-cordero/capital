import { CssBaseline, ThemeProvider } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Loading from "@/components/global/loading";
import Notifications from "@/components/global/notifications";
import { SideBar } from "@/components/global/sidebar";
import { authenticate } from "@/redux/slices/authentication";
import type { RootState } from "@/redux/store";
import { theme } from "@/styles/mui/theme";
import { addNotification } from "@/redux/slices/notifications";
import { getAuthentication } from "@/tanstack/queries/authentication";

export default function Router({ secure }: { secure: boolean }) {
   const { data, isLoading, isError } = useQuery({
      queryKey: ["authentication"],
      queryFn: getAuthentication,
      staleTime: 1 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });
   const navigate = useNavigate();
   const location = useLocation();
   const dispatch = useDispatch();

   const authenticated = useSelector((state: RootState) => state.authentication.value);
   const mode: "light" | "dark" = useSelector((state: RootState) => state.theme.value);
   const dashboard: boolean = location.pathname.startsWith("/dashboard");
   const routing: boolean = (authenticated && !dashboard) || (!authenticated && dashboard);

   useEffect(() => {
      // Set authentication state based on server response
      if (isLoading) return;

      if (isError) {
         dispatch(addNotification({
            type: "error",
            message: "Failed to authenticate"
         }));

         dispatch(authenticate(false));
      } else {
         dispatch(authenticate(Boolean(data)));
      }
   }, [isLoading, data, dispatch]);

   useEffect(() => {
      // Navigate to appropriate route based on authentication state
      if (!isLoading && routing) {
         navigate(authenticated ? "/dashboard" : "/login");
      }
   }, [authenticated, secure, navigate, isLoading, routing]);

   if (isLoading || routing) {
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