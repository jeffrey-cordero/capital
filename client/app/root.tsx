import "@/styles/app.scss";

import { Box, Container, Link, Typography } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";

import store from "@/redux/store";
import Router from "@/routes/router";
import queryClient from "@/tanstack/client";

import type { Route } from "./+types/root";

/**
 * Links function for the root layout
 *
 * @returns {Route.LinksFunction} The links function
 * @description
 * - Adds the preconnect and stylesheet links for the fonts and icons
 */
export const links: Route.LinksFunction = () => [
   { rel: "preconnect", href: "https://fonts.googleapis.com" },
   {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous"
   },
   {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
   }, {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/icon?family=Material+Icons"
   }
];

/**
 * Layout component that sets the theme based on localStorage or preferred color scheme
 *
 * @param {React.ReactNode} children - The children to render
 * @returns {React.ReactNode} The rendered component
 */
export function Layout({ children }: { children: React.ReactNode }): React.ReactNode {
   useEffect(() => {
      // Initialize the theme based on localStorage or preferred color scheme
      const preferredTheme: string | undefined = localStorage.theme;
      const prefersDarkMode: boolean = window?.matchMedia("(prefers-color-scheme: dark)").matches;
      const darkMode: boolean = preferredTheme === "dark" || (!preferredTheme && prefersDarkMode);

      store.dispatch({
         type: "theme/setTheme",
         payload: darkMode ? "dark" : "light"
      });
   }, []);

   return (
      <html lang = "en">
         <head>
            <meta charSet = "utf-8" />
            <meta
               content = "width=device-width, initial-scale=1"
               name = "viewport"
            />
            <title>Capital</title>
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
}

/**
 * App component that provides the Redux and React Query Providers
 *
 * @returns {React.ReactNode} The rendered component
 */
export default function App(): React.ReactNode {
   return (
      <Provider store = { store }>
         <QueryClientProvider client = { queryClient }>
            <Router />
         </QueryClientProvider>
      </Provider>
   );
}

/**
 * Error boundary component that displays an error message
 *
 * @returns {React.ReactNode} The rendered component
 */
export function ErrorBoundary(): React.ReactNode {
   return (
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
               sx = { { width: 350, height: "auto", mb: -4 } }
            />
         </Box>
         <Typography
            align = "center"
            sx = { { fontWeight: "bold", margin: "0", px: 3 } }
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
   );
}