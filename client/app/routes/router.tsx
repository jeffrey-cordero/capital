import { CssBaseline, ThemeProvider } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Notifications from "@/components/global/notifications";
import { SideBar } from "@/components/global/sidebar";
import type { RootState } from "@/redux/store";
import { constructTheme } from "@/styles/mui/theme";

export default function Router() {
   // Authentication-based routing and MUI baselines
   const navigate = useNavigate();
   const theme: "light" | "dark" = useSelector(
      (state: RootState) => state.theme.value
   );
   const authenticated: boolean | undefined = useSelector(
      (state: RootState) => state.authentication.value
   );
   useEffect(() => {
      if (authenticated === undefined) return; // Ignore the initial state

      const dashboard: boolean = window.location.pathname.startsWith("/dashboard");
      const redirecting: boolean = authenticated && !dashboard || !authenticated && dashboard;

      if (redirecting) {
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