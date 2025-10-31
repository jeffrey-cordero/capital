import type { Dispatch } from "@reduxjs/toolkit";
import { useQuery } from "@tanstack/react-query";
import type { Dashboard } from "capital/dashboard";
import { useDispatch } from "react-redux";
import { type NavigateFunction, Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { sendApiRequest } from "@/lib/api";
import { setAccounts } from "@/redux/slices/accounts";
import { setBudgets } from "@/redux/slices/budgets";
import { setEconomy } from "@/redux/slices/economy";
import { setDetails } from "@/redux/slices/settings";
import { setTransactions } from "@/redux/slices/transactions";

/**
 * Fetches dashboard data and initializes application state
 *
 * @param {Dispatch<any>} dispatch - Redux dispatch function
 * @param {NavigateFunction} navigate - Router navigation function
 * @returns {Promise<Dashboard | number | null>} Dashboard data, status code, or 0/null for server failures/errors
 */
export async function fetchDashboard(dispatch: Dispatch<any>, navigate: NavigateFunction): Promise<Dashboard | number | null> {
   const dashboard = await sendApiRequest<Dashboard>(
      "dashboard", "GET", null, dispatch, navigate
   );

   if (typeof dashboard === "object" && dashboard !== null) {
      // Initialize Redux store with core dashboard data
      dispatch(setDetails(dashboard.settings));
      dispatch(setEconomy({
         news: dashboard.economy.news,
         trends: dashboard.economy.trends
      }));
      dispatch(setAccounts(dashboard.accounts));
      dispatch(setBudgets(dashboard.budgets));
      dispatch(setTransactions(dashboard.transactions));

      return dashboard;
   }

   return null;
}

/**
 * Layout wrapper for dashboard pages with data fetching
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