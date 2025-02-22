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
import type { RootState } from "@/redux/store";
import { theme } from "@/styles/mui/theme";

export default function Router({ secure }: { secure: boolean }) {
   const { data, isLoading } = useQuery({
      queryKey: ["authentication"],
      queryFn: getAuthentication,
      staleTime: 1 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000
   });

   const authenticated = useSelector((state: RootState) => state.authentication.value);
   const mode: "light" | "dark" = useSelector((state: RootState) => state.theme.value);
   const routing: boolean = (authenticated && !secure) || (!authenticated && secure);
   const navigate = useNavigate();
   const dispatch = useDispatch();

   useEffect(() => {
      // Set authentication state based on server response
      dispatch(authenticate(Boolean(data)));
   }, [data, dispatch]);

   useEffect(() => {
      // Navigate to appropriate route based on authentication state
      if (!isLoading && routing) {
         navigate(authenticated ? "/home" : "/login");
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