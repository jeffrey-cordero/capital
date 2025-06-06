import "@/styles/app.scss";

import { Box, Container, Link, Typography } from "@mui/material";
import { QueryClientProvider as ReactQueryProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";

import store from "@/redux/store";
import Router from "@/routes/router";
import queryClient from "@/tanstack/client";

import type { Route } from "./+types/root";

/**
 * Root layout links for fonts and styling resources
 */
export const links: Route.LinksFunction = () => [
   {
      rel: "preconnect",
      href: "https://fonts.googleapis.com"
   }, {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous"
   }, {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
   }, {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/icon?family=Material+Icons"
   }
];

/**
 * Sets the theme based on user preferences
 */
function initializeTheme() {
   const preferredTheme = localStorage.theme;
   const prefersDarkMode = window?.matchMedia("(prefers-color-scheme: dark)").matches;

   store.dispatch({
      type: "theme/setTheme",
      payload: preferredTheme === "dark" || (!preferredTheme && prefersDarkMode) ? "dark" : "light"
   });
};

/**
 * Main layout component that provides the HTML structure
 *
 * @param {React.ReactNode} children - Child components to render
 * @returns {React.ReactNode} The application layout component
 */
export function Layout({ children }: { children: React.ReactNode }): React.ReactNode {
   return (
      <html lang = "en">
         <head>
            <meta charSet = "utf-8" />
            <meta
               content = "width=device-width, initial-scale=1"
               name = "viewport"
            />
            <title>
               Capital
            </title>
            <Meta />
            <Links />
         </head>
         <body suppressHydrationWarning = { true }>
            { children }
            <ScrollRestoration />
            <Scripts />
         </body>
      </html>
   );
};

/**
 * Wrapper component for the application or error boundary components to render
 * their children once the preferred theme has been initialized
 *
 * @param {React.ReactNode} children - Child components to render
 * @returns {React.ReactNode} The theme provider component
 */
function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactNode {
   const [initialized, setInitialized] = useState<boolean>(false);

   useEffect(() => {
      initializeTheme();
      setInitialized(true);
   }, []);

   return initialized ? children : null;
};

/**
 * Application root component with Redux and React Query providers
 *
 * @returns {React.ReactNode} The application root component
 */
export default function App(): React.ReactNode {
   return (
      <ThemeProvider>
         <ReduxProvider store = { store }>
            <ReactQueryProvider client = { queryClient }>
               <Router />
            </ReactQueryProvider>
         </ReduxProvider>
      </ThemeProvider>
   );
};

/**
 * Global error boundary component for fallback error display
 *
 * @returns {React.ReactNode} The error boundary component
 */
export function ErrorBoundary(): React.ReactNode {
   return (
      <ThemeProvider>
         <Container
            className = "center"
            sx = { { justifyContent: "center", alignItems: "center" } }
         >
            <Box className = "animation-container">
               <Box
                  alt = "Error"
                  className = "floating"
                  component = "img"
                  src = "/svg/error.svg"
                  sx = { { width: 300, height: "auto", mb: -4 } }
               />
            </Box>
            <Typography
               align = "center"
               sx = { { fontWeight: "bold", margin: "0", px: 3, maxWidth: "350px" } }
               variant = "body1"
            >
               Oops, Something went wrong. If the issue persists, please visit this { " " }
               <Link
                  color = "primary"
                  fontWeight = "bold"
                  href = "/"
                  underline = "none"
               >
                  page
               </Link>
            </Typography>
         </Container>
      </ThemeProvider>
   );
};