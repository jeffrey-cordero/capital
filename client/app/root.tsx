import "@/styles/app.scss";

import { Box, Container, Link, Typography } from "@mui/material";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";

import Router from "@/components/authentication/router";
import store from "@/redux/store";
import queryClient from "@/tanstack/client";
import { getAuthentication } from "@/tanstack/queries/authentication";

import type { Route } from "./+types/root";

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

export function Layout({ children }: { children: React.ReactNode }) {
   return (
      <html lang = "en">
         <head>
            <meta charSet = "utf-8" />
            <meta
               content = "width=device-width, initial-scale=1"
               name = "viewport"
            />
            <Meta />
            <Links />
         </head>
         <body
            data-dark = { store.getState().theme.value === "dark" }
            suppressHydrationWarning = { true }
         >
            { children }
            <ScrollRestoration />
            <Scripts />
         </body>
      </html>
   );
}

export default function App() {
   return (
      <Provider store = { store }>
         <QueryClientProvider client = { queryClient }>
            <Configurations />
            <Router secure = { store.getState().authentication.value } />
         </QueryClientProvider>
      </Provider>
   );
}

export function Configurations() {
   // Prefetch configurations for client-side rendering within the QueryClientProvider
   const client = useQueryClient();

   useEffect(() => {
      // Fetch preferred theme
      const preferredTheme: string | undefined = localStorage.theme;
      const prefersDarkMode: boolean = window?.matchMedia("(prefers-color-scheme: dark)").matches;

      // Prefetch authentication state from the server
      client.prefetchQuery({
         queryKey: ["authentication"],
         queryFn: getAuthentication,
         staleTime: 1 * 60 * 60 * 1000,
         gcTime: 24 * 60 * 60 * 1000
      });

      // Set initial theme state based on localStorage or system preferences
      store.dispatch({
         type: "theme/setTheme",
         payload: preferredTheme === "dark" || (!preferredTheme && prefersDarkMode)  ? "dark" : "light"
      });
   }, [client]);

   return null;
}

export function ErrorBoundary() {
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
               sx = { { width: 350, height: "auto", my: 4 } }
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