import { faFileExport } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Paper, Typography } from "@mui/material";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { addNotification } from "@/redux/slices/notifications";
import type { RootState } from "@/redux/store";

/**
 * ExportAccount component for exporting user account details as a JSON file
 *
 * @returns {React.ReactNode} The ExportAccount component
 */
export default function ExportAccount(): React.ReactNode {
   const dispatch = useDispatch();

   // Get all user data from Redux store
   const settings = useSelector((state: RootState) => state.settings.value);
   const accounts = useSelector((state: RootState) => state.accounts.value);
   const budgets = useSelector((state: RootState) => state.budgets.value);
   const transactions = useSelector((state: RootState) => state.transactions.value);

   const exportAccount = useCallback(() => {
      try {
         // Create export data object
         const exportData = { settings, accounts, budgets, transactions };

         // Convert to JSON string
         const jsonString = JSON.stringify(exportData, null, 3);

         // Create blob and download link
         const blob = new Blob([jsonString], { type: "application/json" });
         const url = URL.createObjectURL(blob);

         // Create temporary download link
         const downloadLink = document.createElement("a");
         downloadLink.href = url;
         downloadLink.download = `capital_export_${new Date().toISOString().split("T")[0]}.json`;

         // Trigger download
         document.body.appendChild(downloadLink);
         downloadLink.click();

         // Clean up
         document.body.removeChild(downloadLink);
         URL.revokeObjectURL(url);

         dispatch(addNotification({
            message: "Data exported successfully",
            type: "success"
         }));
      } catch (error) {
         console.error("Failed to export data:", error);
      }
   }, [dispatch, settings, accounts, budgets, transactions]);

   return (
      <Paper
         elevation = { 3 }
         sx = { { p: 4, mt: 4 } }
      >
         <Typography
            gutterBottom = { true }
            variant = "h6"
         >
            Export Account Data
         </Typography>
         <Typography
            variant = "body1"
         >
            Export all your financial data as a JSON file for backup or migration purposes.
         </Typography>
         <Button
            color = "primary"
            onClick = { exportAccount }
            startIcon = { <FontAwesomeIcon icon = { faFileExport } /> }
            variant = "contained"
         >
            Export Data
         </Button>
      </Paper>
   );
}