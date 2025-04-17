import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@mui/material";
import { useCallback } from "react";
import { useSelector } from "react-redux";

import type { RootState } from "@/redux/store";

/**
 * ExportAccount component for exporting user account details as a JSON file
 *
 * @returns {React.ReactNode} The ExportAccount component
 */
export default function ExportAccount(): React.ReactNode {
   // Get all user data from Redux store
   const settings = useSelector((state: RootState) => state.settings.value);
   const accounts = useSelector((state: RootState) => state.accounts.value);
   const budgets = useSelector((state: RootState) => state.budgets.value);
   const transactions = useSelector((state: RootState) => state.transactions.value);

   const exportAccount = useCallback(() => {
      try {
         // Create export data object
         const exportData = {
            timestamp: new Date().toLocaleString(),
            settings,
            accounts: accounts.map((account) => ({
               ...account,
               account_order: undefined,
               user_id: undefined
            })),
            budgets: {
               Income: {
                  ...budgets.Income,
                  goalIndex: undefined,
                  categories: budgets.Income.categories.map((category) => ({
                     ...category,
                     goalIndex: undefined,
                     category_order: undefined
                  }))
               },
               Expenses: {
                  ...budgets.Expenses,
                  goalIndex: undefined,
                  categories: budgets.Expenses.categories.map((category) => ({
                     ...category,
                     goalIndex: undefined,
                     category_order: undefined
                  }))
               }
            },
            transactions: transactions.map((transaction) => ({
               ...transaction,
               user_id: undefined,
               account_id: transaction.account_id || undefined,
               budget_category_id: transaction.budget_category_id || undefined
            }))
         };

         // Convert to a valid JSON string
         const jsonString = JSON.stringify(exportData, null, 3);

         // Create blob and download link
         const blob = new Blob([jsonString], { type: "application/json" });
         const url = URL.createObjectURL(blob);

         // Create a temporary download link
         const downloadLink = document.createElement("a");
         downloadLink.href = url;
         downloadLink.download = "capital_export.json";

         document.body.appendChild(downloadLink);
         downloadLink.click();

         // Clean up the download link and URL
         document.body.removeChild(downloadLink);
         URL.revokeObjectURL(url);
      } catch (error) {
         console.error("Failed to export data:", error);
      }
   }, [settings, accounts, budgets, transactions]);

   return (
      <Button
         className = "btn-primary"
         color = "success"
         fullWidth = { true }
         onClick = { exportAccount }
         startIcon = { <FontAwesomeIcon icon = { faDownload } /> }
         variant = "contained"
      >
         Export Data
      </Button>
   );
}