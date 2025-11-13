import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@mui/material";
import { useCallback } from "react";
import { useSelector } from "react-redux";

import { selectExportData } from "@/redux/selector";

/**
 * Exports user data as a downloadable JSON file
 *
 * @returns {React.ReactNode} Export data button component
 */
export default function ExportAccount(): React.ReactNode {
   const { settings, accounts, budgets, transactions } = useSelector(selectExportData);

   const exportAccount = useCallback(() => {
      try {
         // Normalize the export data
         const data = {
            timestamp: new Date().toLocaleString(),
            settings,
            accounts: accounts.map((account) => ({
               ...account,
               account_order: undefined
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
               account_id: transaction.account_id || undefined,
               budget_category_id: transaction.budget_category_id || undefined
            }))
         };

         // Normalize into a human-readable format (JSON)
         const json = JSON.stringify(data, null, 3);

         // Create blob and download link
         const blob = new Blob([json], { type: "application/json" });
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
         data-testid = "settings-export"
         fullWidth = { true }
         onClick = { exportAccount }
         startIcon = { <FontAwesomeIcon icon = { faDownload } /> }
         variant = "contained"
      >
         Export Data
      </Button>
   );
}