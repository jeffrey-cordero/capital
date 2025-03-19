import {
   Box,
   Stack,
   styled,
   Typography,
   useTheme
} from "@mui/material";
import { PieChart, useDrawingArea } from "@mui/x-charts";
import { type OrganizedBudgets } from "capital/budgets";
import * as React from "react";

import { displayCurrency } from "@/lib/display";

interface BudgetCategory {
   name: string;
   goal: number;
   current: number;
   color: string;
}

interface StyledTextProps {
   variant: "primary" | "secondary";
}

const StyledText = styled("text", {
   shouldForwardProp: (prop) => prop !== "variant"
})<StyledTextProps>(({ theme }: any) => ({
   textAnchor: "middle",
   dominantBaseline: "central",
   fill: (theme.vars || theme).palette.text.secondary,
   variants: [
      {
         props: {
            variant: "primary"
         },
         style: {
            fontSize: theme.typography.h5.fontSize
         }
      },
      {
         props: ({ variant }) => variant !== "primary",
         style: {
            fontSize: theme.typography.body2.fontSize
         }
      },
      {
         props: {
            variant: "primary"
         },
         style: {
            fontWeight: theme.typography.h5.fontWeight
         }
      },
      {
         props: ({ variant }) => variant !== "primary",
         style: {
            fontWeight: theme.typography.body2.fontWeight
         }
      }
   ]
}));

interface PieCenterLabelProps {
   primaryText: string;
   secondaryText: string;
}

function PieCenterLabel({ primaryText, secondaryText }: PieCenterLabelProps) {
   const { width, height, left, top } = useDrawingArea();
   const primaryY = top + height / 2 - 10;
   const secondaryY = primaryY + 24;

   return (
      <React.Fragment>
         <StyledText
            variant = "primary"
            x = { left + width / 2 }
            y = { primaryY }
         >
            { primaryText }
         </StyledText>
         <StyledText
            variant = "secondary"
            x = { left + width / 2 }
            y = { secondaryY }
         >
            { secondaryText }
         </StyledText>
      </React.Fragment>
   );
}

interface BudgetProgressChartProps {
   title: string;
   categories: BudgetCategory[];
   totalGoal: number;
   totalCurrent: number;
}
function BudgetProgressChart({ title, categories, totalGoal, totalCurrent }: BudgetProgressChartProps) {
   // Calculate percentage of total budget used
   const percentUsed = Math.min(100, Math.round((totalCurrent / totalGoal) * 100)) || 0;

   // Prepare data for pie chart
   const chartData = categories.map(cat => ({
      label: cat.name,
      value: cat.goal
   }));

   return (
      <Stack
         direction = "column"
         spacing = { 2 }
         sx = { { flexGrow: 1, textAlign: "center" } }
      >
         <Typography
            component = "h2"
            variant = "subtitle2"
         >
            { title }
         </Typography>
         <Box sx = { { display: "flex", alignItems: "center" } }>
            <PieChart
               height = { 300 }
               margin = {
                  {
                     left: 80,
                     right: 80,
                     top: 80,
                     bottom: 80
                  }
               }
               series = {
                  [
                     {
                        data: chartData,
                        innerRadius: 75,
                        outerRadius: 100,
                        paddingAngle: 0,
                        highlightScope: { faded: "global", highlighted: "item" }
                     }
                  ]
               }
               slotProps = {
                  {
                     legend: { hidden: true }
                  }
               }
               width = { 260 }
            >
               <PieCenterLabel
                  primaryText = { displayCurrency(totalCurrent) }
                  secondaryText = { `${percentUsed}% Used` }
               />
            </PieChart>
         </Box>
      </Stack>
   );
}

// Helper function to calculate total budget goals
const calculateTotal = (budgets: OrganizedBudgets, type: "Income" | "Expenses") => {
   // Get the most recent month's data
   const mainGoal: number = budgets[type].goals[budgets[type].goalIndex].goal || 0;

   // Sum up all category goals for the most recent month/year
   const categoryTotal = budgets[type].categories.reduce((acc, record) => {
      return acc + record.goals[record.goalIndex].goal;
   }, 0);

   return { mainGoal, categoryTotal };
};

// Helper to generate random current amount until transactions are implemented
const getRandomAmount = (goal: number) => {
   // Generate a random percentage between 10% and 110% of the goal
   return Math.round(goal * (0.1 + Math.random()));
};

export function IncomePieChart({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();

   // Calculate totals (main goal and category total)
   const { mainGoal, categoryTotal } = calculateTotal(budgets, "Income");

   // Generate a random current amount for the total (placeholder)
   const currentTotal = getRandomAmount(mainGoal * 0.8);

   // Prepare data for pie chart
   const pieData = budgets.Income.categories.map(category => ({
      id: category.budget_category_id,
      value: category.goals[category.goalIndex].goal,
      label: category.name || "",
      color: theme.palette.primary.main
   }));

   if (Math.abs(mainGoal - categoryTotal) > 0) {
      // Add an additional data point for the main goal, if there is a difference
      pieData.unshift({
         id: "Income",
         value: Math.abs(mainGoal - categoryTotal),
         label: "Income",
         color: theme.palette.primary.light
      });
   }

   // Prepare data for progress chart
   const progressCategories: BudgetCategory[] = budgets.Income.categories.map((category, index) => {
      const goal = category.goals[category.goalIndex].goal;
      return {
         name: category.name || "Unnamed",
         goal,
         current: getRandomAmount(goal),
         color: `hsl(220, 50%, ${65 - (index * 10)}%)`
      };
   });

   return (
      <Box>
         <Box sx = { { mt: 4 } }>
            <BudgetProgressChart
               categories = { progressCategories }
               title = "Income Progress"
               totalCurrent = { currentTotal }
               totalGoal = { mainGoal }
            />
         </Box>
      </Box>
   );
}

export function ExpensesPieChart({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();

   // Calculate totals
   const { mainGoal, categoryTotal } = calculateTotal(budgets, "Expenses");

   // Generate a random current amount for the total (placeholder)
   const currentTotal = getRandomAmount(mainGoal * 0.8);

   // Prepare data for pie chart
   const pieData = budgets.Expenses.categories.map(category => ({
      id: category.budget_category_id,
      value: category.goals[category.goalIndex].goal,
      label: category.name || "",
      color: theme.palette.error.main
   }));

   if (Math.abs(mainGoal - categoryTotal) > 0) {
      // Add an additional data point for the main goal, if there is a difference
      pieData.unshift({
         id: "Expenses",
         value: Math.abs(mainGoal - categoryTotal),
         label: "Expenses",
         color: theme.palette.error.light
      });
   }

   // Prepare data for progress chart
   const progressCategories: BudgetCategory[] = budgets.Expenses.categories.map((category, index) => {
      const goal = category.goals[category.goalIndex].goal;
      return {
         name: category.name || "Unnamed",
         goal,
         current: getRandomAmount(goal),
         color: `hsl(0, 70%, ${65 - (index * 10)}%)`
      };
   });

   return (
      <Box>
         { /* Add the budget progress chart for Expenses */ }
         <Box sx = { { mt: 4 } }>
            <BudgetProgressChart
               categories = { progressCategories }
               title = "Expenses Progress"
               totalCurrent = { currentTotal }
               totalGoal = { mainGoal }
            />
         </Box>
      </Box>
   );
}