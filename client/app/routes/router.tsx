import { CssBaseline, ThemeProvider } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Notifications from "@/components/global/notifications";
import { SideBar } from "@/components/global/sidebar";
import type { RootState } from "@/redux/store";
import { constructTheme } from "@/styles/mui/theme";

export default function Router() {
   // Handle authentication-based routing
   const navigate = useNavigate();
   const theme: "light" | "dark" = useSelector(
      (state: RootState) => state.theme.value
   );
   const authenticated: boolean | undefined = useSelector(
      (state: RootState) => state.authentication.value
   );

   useEffect(() => {
      if (authenticated === undefined) return; // Initial state

      const dashboard = window.location.pathname.startsWith("/dashboard");
      const redirect = authenticated && !dashboard || !authenticated && dashboard;

      if (redirect) {
         navigate(authenticated ? "/dashboard" : "/");
      }
   }, [navigate, authenticated]);

   return (
      <ThemeProvider theme = { constructTheme(theme) }>
         <CssBaseline />
         <Notifications />
         <SideBar />
         <Outlet />
      </ThemeProvider>
   );
};