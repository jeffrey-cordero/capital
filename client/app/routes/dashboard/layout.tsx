import type { Dispatch } from "@reduxjs/toolkit";
import { useQuery } from "@tanstack/react-query";
import type { Dashboard } from "capital/dashboard";
import { useDispatch } from "react-redux";
import { type NavigateFunction, Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { sendApiRequest } from "@/lib/api";
import { setAccounts } from "@/redux/slices/accounts";
import { setBudgets } from "@/redux/slices/budgets";
import { setMarkets } from "@/redux/slices/markets";

/**
 * Fetches the dashboard data.
 *
 * @param {Dispatch<any>} dispatch - The dispatch function to dispatch actions to the Redux store
 * @param {NavigateFunction} navigate - The navigate function for potential authentication-based redirection
 * @returns {Promise<Dashboard | null>} The dashboard data
 */
export async function fetchDashboard(
   dispatch: Dispatch<any>,
   navigate: NavigateFunction
): Promise<Dashboard | null> {
   const dashboard = await sendApiRequest<Dashboard>(
      "dashboard", "GET", null, dispatch, navigate
   );

   if (typeof dashboard === "object" && dashboard !== null) {
      dispatch(setAccounts(dashboard.accounts));
      dispatch(setBudgets(dashboard.budgets));
      dispatch(setMarkets({
         news: dashboard.news,
         trends: dashboard.trends
      }));

      return dashboard;
   } else {
      return null;
   }
}

/**
 * The layout component for the dashboard pages.
 *
 * @returns {React.ReactNode} The dashboard layout component
 */
export default function Layout(): React.ReactNode {
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