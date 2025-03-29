import { CssBaseline, type Theme, ThemeProvider } from "@mui/material";
import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Notifications from "@/components/global/notifications";
import { SideBar } from "@/components/global/sidebar";
import type { RootState } from "@/redux/store";
import { constructTheme } from "@/styles/mui/theme";

/**
 * The application router component, handling authentication-based routing and MUI baselines.
 *
 * @returns {React.ReactNode} The application router component
 */
export default function Router(): React.ReactNode {
   const navigate = useNavigate();
   const theme: "light" | "dark" = useSelector(
      (state: RootState) => state.theme.value
   );
   const authenticated: boolean | undefined = useSelector(
      (state: RootState) => state.authentication.value
   );
   const providerTheme: Theme = useMemo(() => {
      return constructTheme(theme);
   }, [theme]);

   useEffect(() => {
      if (authenticated === undefined) return; // Ignore the initial state

      const dashboard: boolean = window.location.pathname.startsWith("/dashboard");
      const autoRedirect: boolean = authenticated && !dashboard || !authenticated && dashboard;

      if (autoRedirect) {
         navigate(authenticated ? "/dashboard" : "/");
      }
   }, [navigate, authenticated]);

   return (
      <ThemeProvider theme = { providerTheme }>
         <CssBaseline />
         <Notifications />
         <SideBar />
         <Outlet />
      </ThemeProvider>
   );
};