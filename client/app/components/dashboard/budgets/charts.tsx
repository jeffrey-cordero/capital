import {
   Box,
   Card,
   CardContent,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { PieChart } from "@mui/x-charts";
import { type OrganizedBudgets } from "capital/budgets";

import { displayCurrency } from "@/lib/display";

// Helper function to calculate total budget goals
const calculateTotal = (budgets: OrganizedBudgets, type: "Income" | "Expenses") => {
   // Get the most recent month's data
   const mainGoal: number = budgets[type].goals[0]?.goal || 0;

   // Sum up all category goals for the most recent month/year
   const categoryTotal = budgets[type].categories.reduce((acc, record) => {
      return acc + record.goals[0]?.goal || 0;
   }, 0);

   return { mainGoal, categoryTotal };
};

export function IncomePieChart({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();

   // Calculate totals (main goal and category total)
   const { mainGoal, categoryTotal } = calculateTotal(budgets, "Income");

   // Prepare data for pie chart
   const data = budgets.Income.categories.map(category => ({
      id: category.budget_category_id,
      value: category.goals[0]?.goal || 0,
      label: category.name || "",
      color: theme.palette.primary.main
   }));

   if (Math.abs(mainGoal - categoryTotal) > 0) {
      // Add an additional data point for the main goal, if there is a difference
      data.unshift({
         id: budgets.Income.budget_category_id,
         value: Math.abs(mainGoal - categoryTotal),
         label: "Income",
         color: theme.palette.primary.light
      });
   }

   return (
      <Card
         elevation = { 3 }
         sx = { { borderRadius: 2, height: "100%" } }
         variant = "elevation"
      >
         <CardContent sx = { { p: 2.5 } }>
            <Typography
               component = "h2"
               gutterBottom = { true }
               variant = "subtitle2"
            >
               Income Budget
            </Typography>
            <Typography
               component = "p"
               variant = "h4"
            >
               { displayCurrency(mainGoal) }
            </Typography>
            <Typography
               color = "text.secondary"
               component = "p"
               variant = "subtitle2"
            >
               Monthly Income Budget
            </Typography>

            <Box sx = { { height: 300, mt: 2 } }>
               {
                  data.length > 0 ? (
                     <PieChart
                        height = { 300 }
                        margin = { { top: 10, bottom: 10, left: 10, right: 10 } }
                        series = {
                           [
                              {
                                 data,
                                 innerRadius: 30,
                                 paddingAngle: 2,
                                 cornerRadius: 4,
                                 highlightScope: { faded: "global", highlighted: "item" },
                                 arcLabel: (item) => `${item.label}: ${displayCurrency(item.value)}`,
                                 arcLabelMinAngle: 20
                              }
                           ]
                        }
                        slotProps = {
                           {
                              legend: { hidden: true }
                           }
                        }
                     />
                  ) : (
                     <Stack
                        alignItems = "center"
                        justifyContent = "center"
                        sx = { { height: "100%" } }
                     >
                        <Typography color = "text.secondary">
                           No income categories defined
                        </Typography>
                     </Stack>
                  )
               }
            </Box>
         </CardContent>
      </Card>
   );
}

export function ExpensesPieChart({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();

   // Calculate totals
   const { mainGoal, categoryTotal } = calculateTotal(budgets, "Expenses");

   // Prepare data for pie chart
   const data = budgets.Expenses.categories.map(category => ({
      id: category.budget_category_id,
      value: category.goals[0]?.goal || 0,
      label: category.name || "",
      color: theme.palette.error.main
   }));

   if (Math.abs(mainGoal - categoryTotal) > 0) {
      // Add an additional data point for the main goal, if there is a difference
      data.unshift({
         id: budgets.Expenses.budget_category_id,
         value: Math.abs(mainGoal - categoryTotal),
         label: "Expenses",
         color: theme.palette.error.light
      });
   }

   return (
      <Card
         elevation = { 3 }
         sx = { { borderRadius: 2, height: "100%" } }
         variant = "elevation"
      >
         <CardContent sx = { { p: 2.5 } }>
            <Typography
               component = "h2"
               gutterBottom = { true }
               variant = "subtitle2"
            >
               Expenses Budget
            </Typography>
            <Typography
               component = "p"
               variant = "h4"
            >
               { displayCurrency(mainGoal) }
            </Typography>
            <Typography
               color = "text.secondary"
               component = "p"
               variant = "subtitle2"
            >
               Monthly Expenses Budget
            </Typography>

            <Box sx = { { height: 300, mt: 2 } }>
               {
                  data.length > 0 ? (
                     <PieChart
                        height = { 300 }
                        margin = { { top: 10, bottom: 10, left: 10, right: 10 } }
                        series = {
                           [
                              {
                                 data,
                                 innerRadius: 30,
                                 paddingAngle: 2,
                                 cornerRadius: 4,
                                 highlightScope: { faded: "global", highlighted: "item" },
                                 arcLabel: (item) => `${item.label}: ${displayCurrency(item.value)}`,
                                 arcLabelMinAngle: 20
                              }
                           ]
                        }
                        slotProps = {
                           {
                              legend: { hidden: true }
                           }
                        }
                     />
                  ) : (
                     <Stack
                        alignItems = "center"
                        justifyContent = "center"
                        sx = { { height: "100%" } }
                     >
                        <Typography color = "text.secondary">
                           No expense categories defined
                        </Typography>
                     </Stack>
                  )
               }
            </Box>
         </CardContent>
      </Card>
   );
}