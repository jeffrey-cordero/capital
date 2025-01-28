import "@/styles/app.scss";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import Error from "@/components/global/error";
import store from "@/redux/store";

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
         <body suppressHydrationWarning = { true }>
            { children }
            <ScrollRestoration />
            <Scripts />
         </body>
      </html>
   );
}

const queryClient = new QueryClient();

export default function App() {
   return (
      <Provider store = { store }>
         <QueryClientProvider client = { queryClient }>
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