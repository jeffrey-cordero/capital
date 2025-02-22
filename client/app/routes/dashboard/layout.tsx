import { fetchDashboard } from "@/tanstack/queries/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet } from "react-router";

export default function Layout() {
   const client = useQueryClient();

   useEffect(() => {
      // Prefetch the dashboard data from the server
      client.prefetchQuery({
         queryKey: ["dashboard"],
         queryFn: fetchDashboard,
         staleTime: 15 * 60 * 1000,
         gcTime: 24 * 60 * 60 * 1000
      });
   }, []);

   return (
      <Outlet />
   );
}