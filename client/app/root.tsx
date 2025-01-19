import "@/styles/app.scss";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import Error from "@/components/global/error";
import Notifications from "@/components/global/notifications";
import store from "@/redux/store";
import { theme } from "@/styles/theme";

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
   }
];

export const SERVER_URL = import.meta.env.VITE_SERVER_URL;

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
         <ThemeProvider theme = { theme }>
            <body suppressHydrationWarning = { true }>
               <CssBaseline />
               { children }
               <ScrollRestoration />
               <Scripts />
            </body>
         </ThemeProvider>
      </html>
   );
}

const queryClient = new QueryClient();

export default function App() {
   return (
      <Provider store = { store }>
         <QueryClientProvider client = { queryClient }>
            <Notifications />
            <Outlet />
         </QueryClientProvider>
      </Provider>
   );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
   console.error(error);

   return (
      <Error />
   );
}