import { CssBaseline, ThemeProvider } from "@mui/material";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet } from "react-router";

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
   const theme: "light" | "dark" = useSelector((state: RootState) => state.theme.value);
   const authenticated: boolean | undefined = useSelector((state: RootState) => state.authentication.value);

   useEffect(() => {
      // Handle authentication-based redirection
      if (authenticated === undefined) return;

      const isDashboard = window.location.pathname.startsWith("/dashboard");
      const requiresRedirection = (authenticated && !isDashboard) || (!authenticated && isDashboard);

      if (requiresRedirection) {
         window.location.pathname = authenticated ? "/dashboard" : "/login";
      }
   }, [authenticated]);

   return (
      <div
         data-dark = { theme === "dark" ? "true" : "false" }
         data-testid = "router"
      >
         <ThemeProvider theme = { constructTheme(theme) }>
            <CssBaseline />
            <Notifications />
            <SideBar />
            <Outlet />
         </ThemeProvider>
      </div>
   );
};