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
import { setTransactions } from "@/redux/slices/transactions";

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
      const budgets = dashboard.budgets;

      dispatch(setMarkets({
         news: dashboard.externalAPIs.news,
         trends: dashboard.externalAPIs.trends
      }));
      dispatch(setAccounts(dashboard.accounts));
      dispatch(setBudgets(budgets));
      dispatch(setTransactions(dashboard.transactions.map((t) => {
         return {
            ...t,
            // Pivot to default budget category IDs based on the transaction amount
            budget_category_id: t.budget_category_id || (
               t.amount >= 0 ? budgets.Income.budget_category_id : budgets.Expenses.budget_category_id
            )
         };
      })));

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