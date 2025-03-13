import {
   Box,
   Card,
   CardContent,
   Chip,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { type OrganizedBudgets } from "capital/budgets";

import { getLastSixMonths } from "@/lib/dates";
import { displayCurrency } from "@/lib/display";

// Helper function to calculate monthly totals
const calculateMonthlyTotals = (budgets: OrganizedBudgets) => {
   // Get the last 6 months
   const months = getLastSixMonths();

   // Calculate income and expenses for each month
   const incomeData: number[] = [];
   const expensesData: number[] = [];

   months.forEach(month => {
   // Parse month and year from the label
      const [monthName, yearString] = month.split(" ");
      const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthName) + 1;
      const year = parseInt(yearString);

      // Find income goal for this month
      const incomeGoal = budgets.Income.goals.find(g => g.month === monthIndex && g.year === year)?.goal || 0;
      incomeData.push(incomeGoal);

      // Find expenses goal for this month
      const expensesGoal = budgets.Expenses.goals.find(g => g.month === monthIndex && g.year === year)?.goal || 0;
      expensesData.push(expensesGoal);
   });

   return { months, incomeData, expensesData };
};

const calculateDifference = (incomeData: number[], expensesData: number[]) => {
   // Calculate the total difference between income and expenses
   const totalIncome = incomeData.reduce((sum, val) => sum + val, 0);
   const totalExpenses = expensesData.reduce((sum, val) => sum + val, 0);
   const difference = totalIncome - totalExpenses;

   // Calculate the percentage difference
   const percentDifference = totalIncome > 0  ? Math.round((difference / totalIncome) * 100) : 0;

   return { difference, percentDifference };
};

export function BudgetSummary({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();

   // Calculate monthly totals
   const { months, incomeData, expensesData } = calculateMonthlyTotals(budgets);

   // Calculate difference
   const { difference, percentDifference } = calculateDifference(incomeData, expensesData);

   // Determine if the budget is balanced
   const isPositive = difference >= 0;

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
               Budget Summary
            </Typography>
            <Stack
               direction = "row"
               sx = {
                  {
                     alignItems: "center",
                     gap: 1
                  }
               }
            >
               <Typography
                  component = "p"
                  variant = "h4"
               >
                  { displayCurrency(difference) }
               </Typography>
               <Chip
                  color = { isPositive ? "success" : "error" }
                  label = { `${isPositive ? "+" : ""}${percentDifference}%` }
                  size = "small"
               />
            </Stack>
            <Typography
               color = "text.secondary"
               component = "p"
               variant = "subtitle2"
            >
               { isPositive ? "Budget Surplus" : "Budget Deficit" }
            </Typography>

            <Box sx = { { height: 300, mt: 2 } }>
               <BarChart
                  borderRadius = { 8 }
                  colors = { [theme.palette.success.main, theme.palette.error.main] }
                  grid = { { horizontal: true } }
                  height = { 300 }
                  margin = { { left: 50, right: 0, top: 20, bottom: 20 } }
                  series = {
                     [
                        {
                           id: "income",
                           label: "Income",
                           data: incomeData,
                           stack: "A",
                           color: theme.palette.success.main
                        },
                        {
                           id: "expenses",
                           label: "Expenses",
                           data: expensesData,
                           stack: "B",
                           color: theme.palette.error.main
                        }
                     ]
                  }
                  slotProps = { { legend: { hidden: false } } }
                  xAxis = {
 [{
    scaleType: "band",
    categoryGapRatio: 0.5,
    data: months
 }] as any
                  }
                  yAxis = {
                     [{
                        domainLimit: "nice",
                        valueFormatter: displayCurrency
                     }]
                  }
               />
            </Box>
         </CardContent>
      </Card>
   );
}