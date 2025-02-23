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
   const theme = useSelector((state: RootState) => state.theme.value);
   const authenticated = useSelector((state: RootState) => state.authentication.value);

   useEffect(() => {
      if (authenticated === undefined) return; // Ignore initial state

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