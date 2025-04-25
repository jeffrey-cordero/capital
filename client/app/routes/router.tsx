import { CssBaseline, ThemeProvider } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Notifications from "@/components/global/notifications";
import { SideBar } from "@/components/global/sidebar";
import type { RootState } from "@/redux/store";
import { constructTheme } from "@/styles/mui/theme";

/**
 * Main application router with authentication-based routing and theme handling
 *
 * @returns {React.ReactNode} The main application router component
 */
export default function Router(): React.ReactNode {
   const navigate = useNavigate();
   const theme: "light" | "dark" = useSelector((state: RootState) => state.theme.value);
   const authenticated: boolean | undefined = useSelector((state: RootState) => state.authentication.value);

   useEffect(() => {
      // Handle authentication-based redirection
      if (authenticated === undefined) return;

      const isDashboard = window.location.pathname.startsWith("/dashboard");
      const requiresRedirection = (authenticated && !isDashboard) || (!authenticated && isDashboard);

      if (requiresRedirection) {
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