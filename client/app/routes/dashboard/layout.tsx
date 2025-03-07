import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { fetchDashboard } from "@/tanstack/queries/dashboardQueries";

export default function Layout() {
   const dispatch = useDispatch(), navigate = useNavigate();

   const { data, isError, isLoading } = useQuery({
      queryKey: ["dashboard"],
      queryFn: () => fetchDashboard(dispatch, navigate),
      staleTime: 15 * 60 * 1000,
      gcTime: 30 * 60 * 1000
   });

   if (isLoading || isError || data === null) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}